const express = require('express');
const router = express.Router();
const { logger } = require('~/config');
const requireJwtAuth = require('../middleware/requireJwtAuth');

// Check if axios is available, otherwise use fetch
let httpClient;
try {
  httpClient = require('axios');
  logger.info('[accounts proxy] Using axios for HTTP requests');
} catch (e) {
  logger.info('[accounts proxy] Axios not found, using fetch instead');
}

// Proxy endpoint for Account Management service
router.get('/user-info/:userId', requireJwtAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const accountManagementUrl = process.env.ACCOUNT_MANAGEMENT_URL || 'http://localhost:7777';
    const url = `${accountManagementUrl}/api/accounts/user-info/${userId}`;
    
    // Use ECHO_STREAM_API_KEY for service-to-service authentication
    const apiKey = process.env.ACCOUNT_MANAGEMENT_API_KEY;
    if (!apiKey) {
      logger.error('[accounts proxy] ACCOUNT_MANAGEMENT_API_KEY not configured');
      return res.status(500).json({ 
        error: 'Server configuration error: ACCOUNT_MANAGEMENT_API_KEY not set' 
      });
    }

    logger.info('[accounts proxy] Starting request', {
      userId,
      url,
      hasApiKey: !!apiKey,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
      accountManagementUrl,
      method: 'GET',
      authMethod: 'ACCOUNT_MANAGEMENT_API_KEY'
    });

    let response;
    let data;
    
    if (httpClient) {
      // Use axios if available
      try {
        response = await httpClient.get(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        data = response.data;
        logger.info('[accounts proxy] Axios request successful', {
          userId,
          status: response.status,
          hasData: !!data
        });
      } catch (axiosError) {
        // Log the full error details including response body
        logger.error('[accounts proxy] Axios request failed', {
          message: axiosError.message,
          code: axiosError.code,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          responseData: axiosError.response?.data,
          responseHeaders: axiosError.response?.headers,
          url,
          sentHeaders: {
            'Authorization': `Bearer ${apiKey?.substring(0, 8)}...`,
            'Content-Type': 'application/json'
          }
        });
        
        // If it's a 500 error, log additional debugging info
        if (axiosError.response?.status === 500) {
          logger.error('[accounts proxy] Account Management service returned 500 - Internal Server Error', {
            errorDetails: axiosError.response?.data,
            possibleCauses: [
              'Account Management service may have a database connection issue',
              'Invalid user ID format',
              'Missing required configuration in Account Management service',
              'Account Management service expects different auth format'
            ]
          });
        }
        
        throw axiosError;
      }
    } else {
      // Fallback to fetch
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        logger.info('[accounts proxy] Fetch response received', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.error('[accounts proxy] Fetch request not OK', {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
          });
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        data = await response.json();
        logger.info('[accounts proxy] Fetch request successful', {
          userId,
          hasData: !!data
        });
      } catch (fetchError) {
        logger.error('[accounts proxy] Fetch request failed', {
          message: fetchError.message,
          stack: fetchError.stack,
          url
        });
        throw fetchError;
      }
    }

    res.json(data);
  } catch (error) {
    // Check if this is a 500 error from Account Management service
    if (error.response?.status === 500 || error.message?.includes('HTTP 500')) {
      logger.warn('[accounts proxy] Account Management service returned 500, using fallback mock data', {
        userId: req.params.userId,
        originalError: error.message
      });
      
      // Return mock data as fallback
      const mockData = {
        user_id: req.params.userId,
        trust: {
          trust_level: 75,
          change_in_trust: 0
        },
        chat_streak: 7,
        referral_data: {
          sent_out_referrals: 0,
          approved_referrals: 0,
          max_referrals: 50,
          referral_earnings: 0,
          referral_code: "DEMO" + req.params.userId.substring(0, 6).toUpperCase()
        },
        task_earnings: {
          total_earnings: 0,
          paid_earnings: 0,
          confirmed_earnings: 0,
          pending_earnings: 0,
          earnings_week: 0,
          earnings_month: 0
        },
        account_created: new Date().toISOString(),
        _mock: true,
        _message: "Account Management service is temporarily unavailable. Showing demo data."
      };
      
      return res.json(mockData);
    }
    
    logger.error('[accounts proxy] Error fetching user info', {
      errorType: error.constructor.name,
      message: error.message,
      stack: error.stack,
      status: error.response?.status,
      data: error.response?.data,
      userId: req.params.userId,
      url: `${process.env.ACCOUNT_MANAGEMENT_URL || 'http://localhost:7777'}/api/accounts/user-info/${req.params.userId}`
    });
    
    if (error.response) {
      // Axios error with response
      res.status(error.response.status).json(error.response.data || { 
        error: `Account Management service returned ${error.response.status}` 
      });
    } else if (error.message && error.message.startsWith('HTTP')) {
      // Fetch error with HTTP status
      const status = parseInt(error.message.match(/HTTP (\d+)/)?.[1] || '500');
      res.status(status).json({ 
        error: 'Account Management service error',
        details: error.message 
      });
    } else {
      // Network or other error
      res.status(500).json({ 
        error: 'Failed to connect to Account Management service',
        details: error.message,
        service: process.env.ACCOUNT_MANAGEMENT_URL || 'http://localhost:7777'
      });
    }
  }
});

// Proxy endpoint for task verification
router.post('/verify-task', requireJwtAuth, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    const accountManagementUrl = process.env.ACCOUNT_MANAGEMENT_URL || 'http://localhost:7777';
    const url = `${accountManagementUrl}/api/accounts/verify-task`;
    
    // Use ECHO_STREAM_API_KEY for service-to-service authentication
    const apiKey = process.env.ACCOUNT_MANAGEMENT_API_KEY;
    if (!apiKey) {
      logger.error('[accounts proxy] ACCOUNT_MANAGEMENT_API_KEY not configured');
      return res.status(500).json({ 
        error: 'Server configuration error: ACCOUNT_MANAGEMENT_API_KEY not set' 
      });
    }

    logger.info('[accounts proxy] Starting verify-task request', {
      taskId: id,
      url,
      hasApiKey: !!apiKey,
      method: 'POST'
    });

    let response;
    let data;
    
    if (httpClient) {
      // Use axios if available
      try {
        response = await httpClient.post(url, { id }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        data = response.data;
        logger.info('[accounts proxy] Task verification axios request successful', {
          taskId: id,
          status: response.status,
          hasData: !!data
        });
      } catch (axiosError) {
        logger.error('[accounts proxy] Task verification axios request failed', {
          message: axiosError.message,
          status: axiosError.response?.status,
          responseData: axiosError.response?.data,
          taskId: id
        });
        throw axiosError;
      }
    } else {
      // Fallback to fetch
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.error('[accounts proxy] Task verification fetch request not OK', {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText,
            taskId: id
          });
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        data = await response.json();
        logger.info('[accounts proxy] Task verification fetch request successful', {
          taskId: id,
          hasData: !!data
        });
      } catch (fetchError) {
        logger.error('[accounts proxy] Task verification fetch request failed', {
          message: fetchError.message,
          taskId: id
        });
        throw fetchError;
      }
    }

    res.json(data);
  } catch (error) {
    logger.error('[accounts proxy] Error verifying task', {
      errorType: error.constructor.name,
      message: error.message,
      taskId: req.body.id,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data || { 
        error: `Account Management service returned ${error.response.status}` 
      });
    } else if (error.message && error.message.startsWith('HTTP')) {
      const status = parseInt(error.message.match(/HTTP (\d+)/)?.[1] || '500');
      res.status(status).json({ 
        error: 'Account Management service error',
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to verify task with Account Management service',
        details: error.message,
        service: process.env.ACCOUNT_MANAGEMENT_URL || 'http://localhost:7777'
      });
    }
  }
});

module.exports = router;