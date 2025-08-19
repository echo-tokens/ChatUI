const express = require('express');
const multer = require('multer');
const { requireJwtAuth, checkBan } = require('~/server/middleware');
const { supabase } = require('~/lib/supabase');
const { logger } = require('~/config');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Maximum 5 files
  }
});

/**
 * Submit a help request with optional file uploads
 * @route POST /help/submit
 * @param {string} text - The help request description
 * @param {File[]} files - Optional files to upload
 * @returns {Promise<Object>} Success response with request ID
 */
router.post('/submit', requireJwtAuth, checkBan, upload.array('files', 5), async (req, res) => {
  try {
    const { text, chat_id, state } = req.body;
    const userId = req.user.id;
    const files = req.files || [];

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Help request text is required' });
    }

    // Upload files to Supabase storage
    const uploadedFiles = [];
    
    for (const file of files) {
      try {
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `help_requests/${userId}/${chat_id}/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('help_request_files')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (error) {
          logger.error('Error uploading file to Supabase:', error);
          continue; // Skip this file but continue with others
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('help_request_files')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          url: urlData.publicUrl,
          path: filePath
        });
      } catch (fileError) {
        logger.error('Error processing file upload:', fileError);
        // Continue with other files
      }
    }

    // Insert help request into database
    const { data: helpRequest, error: dbError } = await supabase
      .from('help_requests')
      .insert({
        user_id: userId,
        chat_id: chat_id || null,
        state: state ? JSON.parse(state) : null,
        text: text.trim(),
        files: uploadedFiles.length > 0 ? uploadedFiles : null
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Error inserting help request:', dbError);
      return res.status(500).json({ error: 'Failed to save help request' });
    }

    logger.info(`Help request submitted by user ${userId}, ID: ${helpRequest.id}`);

    res.status(201).json({
      success: true,
      help_request_id: helpRequest.id,
      files_uploaded: uploadedFiles.length
    });

  } catch (error) {
    logger.error('Error in help request submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get help requests for the authenticated user
 * @route GET /help/requests
 * @returns {Promise<Array>} Array of user's help requests
 */
router.get('/requests', requireJwtAuth, checkBan, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching help requests:', error);
      return res.status(500).json({ error: 'Failed to fetch help requests' });
    }

    res.status(200).json(helpRequests);

  } catch (error) {
    logger.error('Error in help requests fetch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
