const express = require('express');
const router = express.Router();
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { 
  getTaskInfo,
  submitTask,
  checkTaskCompletion
} = require('~/models/Task');
const jwt = require('jsonwebtoken');
const { User } = require('~/db/models');
const { supabase } = require('~/lib/supabase');

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

module.exports = router; 