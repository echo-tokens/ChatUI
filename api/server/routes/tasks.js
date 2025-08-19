const express = require('express');
const router = express.Router();
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { 
  getTaskInfo,
  submitTask,
  checkTaskCompletion
} = require('~/models/Task');
const { supabase } = require('~/lib/supabase');
const jwt = require('jsonwebtoken');
const { User } = require('~/db/models');

// Apply JWT authentication to all task routes
router.use(requireJwtAuth);

/**
 * GET /api/tasks/info/:taskId
 * Get task information including experiment details and outputs
 */
router.get('/info/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    if (!decoded.id) {
      return res.status(401).json({ error: 'Invalid JWT token' });
    }

    const taskInfo = await getTaskInfo(taskId, decoded.id);
    res.json(taskInfo);
  } catch (error) {
    logger.error('[Tasks.getTaskInfo] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get task information' });
  }
});

/**
 * GET /api/tasks/completion/:taskId
 * Check if a task has been completed
 */
router.get('/completion/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    if (!decoded.id) {
      return res.status(401).json({ error: 'Invalid JWT token' });
    }

    const completionStatus = await checkTaskCompletion(taskId);
    res.json(completionStatus);
  } catch (error) {
    logger.error('[Tasks.checkCompletion] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to check task completion' });
  }
});

/**
 * POST /api/tasks/submit
 * Submit task result from AdTile component
 */
router.post('/submit', async (req, res) => {
  try {
    const { taskId, result } = req.body;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    if (!result) {
      return res.status(400).json({ error: 'Task result is required' });
    }

    if (!decoded.id) {
      return res.status(401).json({ error: 'Invalid JWT token' });
    }

    // Call the model function to submit the task
    const submitResult = await submitTask(taskId, result);
    res.json(submitResult);
  } catch (error) {
    logger.error('[Tasks.submit] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit task result' });
  }
});

/**
 * POST /api/tasks/feedback
 * Submit ad feedback
 */
router.post('/feedback', async (req, res) => {
  try {
    const { ad_insertion_id, product_feedback, relevance_rating } = req.body;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    
    if (!ad_insertion_id) {
      return res.status(400).json({ error: 'Ad insertion ID is required' });
    }

    if (!decoded.id) {
      return res.status(401).json({ error: 'Invalid JWT token' });
    }

    let update_dict = {};
    if (product_feedback) {
      update_dict.product_feedback = product_feedback;
    }
    if (relevance_rating) {
      update_dict.relevance_rating = relevance_rating;
    }

    // Upsert feedback into Supabase
    const { data, error } = await supabase
      .from('ad_gen_logs')
      .update(update_dict)
      .eq('id', ad_insertion_id);

    if (error) {
      logger.error('[Tasks.feedback] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    logger.error('[Tasks.feedback] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit feedback' });
  }
});

/**
 * POST /api/tasks/thumb-rating
 * Submit thumb rating for an ad
 */
router.post('/thumb-rating', async (req, res) => {
  try {
    const { ad_insertion_id, thumb_rating } = req.body;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    
    if (!ad_insertion_id) {
      return res.status(400).json({ error: 'Ad insertion ID is required' });
    }

    if (!thumb_rating || !['up', 'down'].includes(thumb_rating)) {
      return res.status(400).json({ error: 'Thumb rating must be "up" or "down"' });
    }

    if (!decoded.id) {
      return res.status(401).json({ error: 'Invalid JWT token' });
    }

    // Upsert thumb rating into Supabase
    if (thumb_rating !== null) {
      const { data, error } = await supabase
        .from('ad_gen_logs')
        .update({
          thumb_rating: thumb_rating || null
        })
        .eq('id', ad_insertion_id);
    }

    if (error) {
      logger.error('[Tasks.thumb-rating] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to submit thumb rating' });
    }

    res.json({ success: true, message: 'Thumb rating submitted successfully' });
  } catch (error) {
    logger.error('[Tasks.thumb-rating] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit thumb rating' });
  }
});

module.exports = router; 