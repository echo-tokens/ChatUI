const express = require('express');
const router = express.Router();
const { logger } = require('@librechat/data-schemas');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { 
  getTaskStats, 
  getDataSharingStatus, 
  acceptDataSharing, 
  claimAndLoadTask, 
  submitTask,
  getAvailableTaskTypes
} = require('~/models/Task');
const jwt = require('jsonwebtoken');
const { User } = require('~/db/models');

// Apply JWT authentication to all task routes
router.use(requireJwtAuth);

// todo: verify user_id matches jwt user_id

/**
 * GET /api/tasks/stats/:userId
 * Get task statistics for a user
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (decoded.id !== userId) {
      return res.status(401).json({ error: 'JWT user ID does not match requested user ID'});
    }

    const stats = await getTaskStats(userId);
    res.json(stats);
  } catch (error) {
    logger.error('[Tasks.getStats] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get task statistics' });
  }
});

/**
 * GET /api/tasks/data-sharing-status/:userId
 * Check if user is enrolled in data sharing agreement
 */
router.get('/data-sharing-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    } 
    
    if (decoded.id !== userId) {
      return res.status(401).json({ error: 'JWT user ID does not match requested user ID'});
    }

    const status = await getDataSharingStatus(userId);
    res.json(status);
  } catch (error) {
    logger.error('[Tasks.getDataSharingStatus] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to check data sharing status' });
  }
});

/**
 * POST /api/tasks/accept-data-sharing/:userId
 * Accept data sharing agreement for a user
 */
router.post('/accept-data-sharing/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (decoded.id !== userId) {
      return res.status(401).json({ error: 'JWT user ID does not match requested user ID'});
    }

    const result = await acceptDataSharing(userId);
    res.json(result);
  } catch (error) {
    logger.error('[Tasks.acceptDataSharing] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to accept data sharing agreement' });
  }
});

/**
 * POST /api/tasks/claim-and-load/:userId
 * Claim and load a task for a user
 */
router.post('/claim-and-load/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (decoded.id !== userId) {
      return res.status(401).json({ error: 'JWT user ID does not match requested user ID'});
    }

    // Load from mongodb, check if user is enrolled in data sharing agreement
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    if (!user.data_sharing_enrolled) {
      return res.status(400).json({ error: 'User is not enrolled in data sharing agreement' });
    }

    const task = await claimAndLoadTask(userId);
    
    // If no tasks available, return 301 status
    if (!task) {
      return res.status(301).json({ error: 'No tasks available' });
    }

    res.json(task);
  } catch (error) {
    logger.error('[Tasks.claimAndLoadTask] Error:', error);
    
    // Handle specific error for no tasks available
    if (error.status === 301) {
      return res.status(301).json({ error: 'No tasks available' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to claim and load task' });
  }
});

/**
 * POST /api/tasks/submit
 * Submit a task response
 */
router.post('/submit', async (req, res) => {
  try {
    const { task_id, response } = req.body;
    const userId = req.user?.id || req.body.user_id; // Get user ID from auth or request body
    const decoded = jwt.verify(req.headers.authorization && req.headers.authorization.split(' ')[1], process.env.CHAT_UI_JWT_SECRET);
    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (decoded.id !== userId) {
      return res.status(401).json({ error: 'JWT user ID does not match requested user ID'});
    }

    const result = await submitTask(userId, task_id, response);
    res.json(result);
  } catch (error) {
    logger.error('[Tasks.submitTask] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit task' });
  }
});

/**
 * GET /api/tasks/types
 * Get available task types
 */
router.get('/types', async (req, res) => {
  try {
    const types = await getAvailableTaskTypes();
    res.json(types);
  } catch (error) {
    logger.error('[Tasks.getAvailableTaskTypes] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get task types' });
  }
});

module.exports = router; 