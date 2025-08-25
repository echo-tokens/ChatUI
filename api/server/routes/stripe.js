const express = require('express');
const router = express.Router();
const { requireJwtAuth } = require('~/server/middleware');
const { logger } = require('~/config');
const { createClient } = require('@supabase/supabase-js');

// Stripe OAuth configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Stripe
let stripe;
try {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

// Initialize Supabase
let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
}


/**
 * GET /api/stripe/has-connected-account/:user_id
 * Check if a user has a connected Stripe account
 */
router.get('/has-connected-account/:user_id', requireJwtAuth, async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required parameter: user_id'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        error: 'Supabase is not properly configured'
      });
    }

    // Check if user has a stripe_connected_account_id
    const { data: userData, error: userError } = await supabase
      .from('chat_users')
      .select('stripe_connected_account_id')
      .eq('id', user_id)
      .single();

    if (userError) {
      logger.error('Error checking Stripe account for user:', userError);
      return res.status(500).json({
        error: 'Failed to check Stripe account status'
      });
    }

    const hasConnectedAccount = !!(userData && userData.stripe_connected_account_id);

    res.json({
      has_connected_account: hasConnectedAccount
    });

  } catch (error) {
    logger.error('Error checking Stripe account status:', error);
    res.status(500).json({
      error: 'Internal server error while checking Stripe account status'
    });
  }
});

/**
 * POST /api/transfer-payout
 * Transfer payout to user's Stripe account
 */
router.post('/transfer-payout', requireJwtAuth, async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required parameter: user_id'
      });
    }

    if (!stripe) {
      return res.status(500).json({
        error: 'Stripe is not properly configured'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        error: 'Supabase is not properly configured'
      });
    }

    const MINIMUM_PAYOUT = 10; // $10 minimum payout

    // Get user's Stripe account ID
    const { data: userData, error: userError } = await supabase
      .from('chat_users')
      .select('stripe_connected_account_id')
      .eq('id', user_id)
      .single();

    if (userError) {
      logger.error('Error fetching user Stripe account:', userError);
      return res.status(500).json({
        error: 'Failed to fetch user Stripe account'
      });
    }

    if (!userData || !userData.stripe_connected_account_id) {
      return res.status(400).json({
        error: 'User does not have a connected Stripe account'
      });
    }

    // Get all unpaid tasks for the user
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks_new')
      .select('id, price')
      .eq('user_id', user_id)
      .eq('paid_out', false);

    if (tasksError) {
      logger.error('Error fetching unpaid tasks:', tasksError);
      return res.status(500).json({
        error: 'Failed to fetch unpaid tasks'
      });
    }

    // Calculate total payout amount
    const totalAmount = tasksData.reduce((sum, task) => sum + (task.price || 0), 0);

    if (totalAmount < MINIMUM_PAYOUT) {
      return res.status(400).json({
        error: `Not enough to withdraw. Minimum payout is $${MINIMUM_PAYOUT}, available: $${totalAmount.toFixed(2)}`
      });
    }

    // Convert to cents for Stripe (Stripe uses cents)
    const amountInCents = Math.round(totalAmount * 100);

    logger.info(`Initiating Stripe transfer for user ${user_id}: $${totalAmount} (${amountInCents} cents)`);

    try {
      // Update all unpaid tasks to paid
      const { error: updateError } = await supabase
        .from('tasks_new')
        .update({ 
          paid_out: true,
          paid_out_date: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('paid_out', false);

      if (updateError) {
        logger.error('Error updating tasks to paid:', updateError);
        return res.status(500).json({
          error: 'Transfer completed but failed to update task status'
        });
      }
     
      // Create Stripe transfer
      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: 'usd',
        destination: userData.stripe_connected_account_id,
        description: `Echo earnings payout for user ${user_id} on ${new Date().toISOString()}`,
      });

      logger.info(`Stripe transfer successful: ${transfer.id} for user ${user_id}`);

      res.json({
        success: true,
        message: 'Payout transferred successfully',
        transfer_id: transfer.id,
        amount: totalAmount,
        task_count: tasksData.length
      });

    } catch (stripeError) {
      logger.error('Stripe transfer failed:', stripeError);
      // Rollback the tasks to unpaid
      const { error: rollbackError } = await supabase
        .from('tasks_new')
        .update({ 
          paid_out: false,
          paid_out_date: null
        })
        .in('id', tasksData.map(task => task.id))

      if (rollbackError) {
        logger.error('Error rolling back tasks to unpaid:', rollbackError);
        return res.status(500).json({
          error: 'Failed to roll back tasks to unpaid after Stripe transfer failed'
        });
      }

      return res.status(500).json({
        error: `Stripe transfer failed: ${stripeError.message}`
      });
    }

  } catch (error) {
    logger.error('Error processing payout transfer:', error);
    res.status(500).json({
      error: 'Internal server error while processing payout transfer'
    });
  }
});

/**
 * POST /api/connect-stripe-account
 * Connect a user's Stripe account using OAuth authorization code
 */
router.post('/connect-stripe-account', requireJwtAuth, async (req, res) => {
  try {
    const { user_id, code } = req.body;

    if (!user_id || !code) {
      return res.status(400).json({
        error: 'Missing required parameters: user_id and code'
      });
    }

    if (!stripe) {
      return res.status(500).json({
        error: 'Stripe is not properly configured'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        error: 'Supabase is not properly configured'
      });
    }

    // Validate Stripe configuration
    if (!STRIPE_SECRET_KEY) {
      logger.error('STRIPE_SECRET_KEY not configured');
      return res.status(500).json({
        error: 'Stripe secret key not configured'
      });
    }
    
    let tokenResponse;
    try {
      tokenResponse = await stripe.oauth.token({
        grant_type: 'authorization_code',
        code: code,
      });
      
      logger.info(`Successfully exchanged code for token response:`, {
        has_stripe_user_id: !!tokenResponse.stripe_user_id,
        stripe_user_id: tokenResponse.stripe_user_id
      });
    } catch (stripeError) {
      logger.error('Stripe OAuth token exchange failed:', {
        error: stripeError.message,
        error_type: stripeError.type,
        code_preview: code.substring(0, 10) + '...',
        user_id: user_id
      });
      
      // If the code was already used, check if the user already has a Stripe account connected
      if (stripeError.message && stripeError.message.includes('already been used')) {
        logger.info(`Authorization code already used for user ${user_id}, checking if account is already connected`);
        
        // Check if user already has a stripe_account_id
        const { data: userData, error: userError } = await supabase
          .from('chat_users')
          .select('stripe_connected_account_id')
          .eq('id', user_id)
          .single();
        
        if (userError) {
          logger.error('Error checking existing Stripe account:', userError);
          throw stripeError;
        }
        
        if (userData && userData.stripe_connected_account_id) {
          logger.info(`User ${user_id} already has Stripe account connected: ${userData.stripe_connected_account_id}`);
          return res.json({
            success: true,
            message: 'Stripe account already connected',
            stripe_user_id: userData.stripe_connected_account_id
          });
        }
      }
      
      throw stripeError;
    }

    if (!tokenResponse.stripe_user_id) {
      return res.status(400).json({
        error: 'Failed to retrieve Stripe user ID from OAuth response'
      });
    }

    // Update user's stripe_account_id in Supabase
    const { error: updateError } = await supabase
      .from('chat_users')
      .update({ 
        stripe_connected_account_id: tokenResponse.stripe_user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      logger.error('Error updating user with Stripe account ID:', updateError);
      return res.status(500).json({
        error: 'Failed to save Stripe account ID to database'
      });
    }

    logger.info(`Successfully connected Stripe account ${tokenResponse.stripe_user_id} for user ${user_id}`);

    res.json({
      success: true,
      message: 'Stripe account connected successfully',
      stripe_user_id: tokenResponse.stripe_user_id
    });

  } catch (error) {
    logger.error('Error connecting Stripe account:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeError') {
      return res.status(400).json({
        error: `Stripe error: ${error.message}`
      });
    }

    res.status(500).json({
      error: 'Internal server error while connecting Stripe account'
    });
  }
});

module.exports = router;
