const { sendEvent } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { Constants, progress } = require('librechat-data-provider');
const {
  handleAbortError,
  createAbortController,
  cleanupAbortController,
} = require('~/server/middleware');
const { disposeClient, clientRegistry, requestDataMap } = require('~/server/cleanup');
const { createOnProgress } = require('~/server/utils');
const { saveMessage } = require('~/models');
const { debug, debugGroups } = require('~/server/utils/debug');

const AgentController = async (req, res, next, initializeClient, addTitle) => {
  let {
    text,
    isRegenerate,
    endpointOption,
    conversationId,
    isContinued = false,
    editedContent = null,
    parentMessageId = null,
    overrideParentMessageId = null,
    responseMessageId: editedResponseMessageId = null,
  } = req.body;

  debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Initial request data:', {
    hasConversationId: !!conversationId,
    conversationId: conversationId,
    hasParentMessageId: !!parentMessageId,
    parentMessageId: parentMessageId,
    hasText: !!text,
    textPreview: text?.substring(0, 50),
    endpoint: endpointOption?.endpoint,
    reqBodyKeys: Object.keys(req.body)
  });

  let sender;
  let abortKey;
  let userMessage;
  let promptTokens;
  let userMessageId;
  let responseMessageId;
  let userMessagePromise;
  let getAbortData;
  let progressCallback;
  let client = null;
  // Initialize as an array
  let cleanupHandlers = [];

  const newConvo = !conversationId;
  const userId = req.user.id;

  debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Conversation analysis:', {
    newConvo: newConvo,
    hasConversationId: !!conversationId,
    conversationId: conversationId,
    userId: userId,
    userIdFromReq: req.user.id,
    userObjectId: req.user._id,
    userEmail: req.user.email
  });

  // For new conversations, generate a conversationId
  if (newConvo) {
    const { v4: uuidv4 } = require('uuid');
    conversationId = uuidv4();
    
    // Update the request body to include the new conversationId
    req.body.conversationId = conversationId;
  }

  // Create userMessage early to prevent undefined errors during abort
  // Generate messageId for user message
  const crypto = require('crypto');
  const generatedUserMessageId = crypto.randomUUID();
  
  // Create the user message object early in the process
  // For new conversations, use Constants.NO_PARENT instead of null for proper threading
  const userMessageParentId = newConvo ? Constants.NO_PARENT : parentMessageId;
  
  const createdUserMessage = {
    messageId: generatedUserMessageId,
    parentMessageId: userMessageParentId,
    conversationId: conversationId,
    sender: req.user?.name || 'User',
    text: text,
    isCreatedByUser: true,
    endpoint: endpointOption?.endpoint,
    createdAt: new Date(),
    user: userId
  };
  
  debug(debugGroups.GENERAL, 'AGENTS/REQUEST - User message parent analysis:', {
    isNewConvo: newConvo,
    originalParentMessageId: parentMessageId,
    finalUserMessageParentId: userMessageParentId,
    constantsNoParent: Constants.NO_PARENT
  });
  
  // Set userMessage early so it's available even if onStart doesn't get called
  userMessage = createdUserMessage;
  
  debug(debugGroups.GENERAL, 'AGENTS/REQUEST - User message created:', {
    messageId: userMessage.messageId,
    conversationId: userMessage.conversationId,
    hasText: !!userMessage.text,
    sender: userMessage.sender
  });

  // Create handler to avoid capturing the entire parent scope
  let getReqData = (data = {}) => {
    for (let key in data) {
      if (key === 'userMessage') {
        // Only update userMessage if a new one is provided and it's different
        if (data[key] && data[key] !== userMessage) {
          userMessage = data[key];
          userMessageId = data[key].messageId;
        }
      } else if (key === 'userMessagePromise') {
        userMessagePromise = data[key];
      } else if (key === 'responseMessageId') {
        responseMessageId = data[key];
      } else if (key === 'promptTokens') {
        promptTokens = data[key];
      } else if (key === 'sender') {
        sender = data[key];
      } else if (key === 'abortKey') {
        abortKey = data[key];
      } else if (!conversationId && key === 'conversationId') {
        conversationId = data[key];
      }
    }
  };

  // Create a function to handle final cleanup
  const performCleanup = () => {
    logger.debug('[AgentController] Performing cleanup');
    // Make sure cleanupHandlers is an array before iterating
    if (Array.isArray(cleanupHandlers)) {
      // Execute all cleanup handlers
      for (const handler of cleanupHandlers) {
        try {
          if (typeof handler === 'function') {
            handler();
          }
        } catch (e) {
          logger.error('[AgentController] Error in cleanup handler', e);
        }
      }
    }

    // Clean up abort controller
    if (abortKey) {
      logger.debug('[AgentController] Cleaning up abort controller');
      cleanupAbortController(abortKey);
    }

    // Dispose client properly
    if (client) {
      disposeClient(client);
    }

    // Clear all references
    client = null;
    getReqData = null;
    userMessage = null;
    getAbortData = null;
    progressCallback = null;
    endpointOption.agent = null;
    endpointOption = null;
    cleanupHandlers = null;
    userMessagePromise = null;

    // Clear request data map
    if (requestDataMap.has(req)) {
      requestDataMap.delete(req);
    }
    logger.debug('[AgentController] Cleanup completed');
  };

  try {
    /** @type {{ client: TAgentClient }} */
    const result = await initializeClient({ req, res, endpointOption });
    client = result.client;

    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Client initialized:', {
      clientType: client?.constructor?.name,
      hasClient: !!client,
      clientModel: client?.model,
      clientOptions: client?.options ? Object.keys(client.options) : 'no options'
    });

    // Register client with finalization registry if available
    if (clientRegistry) {
      clientRegistry.register(client, { userId }, client);
    }

    // Store request data in WeakMap keyed by req object
    requestDataMap.set(req, { client });

    // Use WeakRef to allow GC but still access content if it exists
    const contentRef = new WeakRef(client.contentParts || []);

    // Minimize closure scope - only capture small primitives and WeakRef
    getAbortData = () => {
      debug(debugGroups.GENERAL, 'AGENTS/REQUEST - getAbortData called at:', new Date().toISOString());
      debug(debugGroups.GENERAL, 'AGENTS/REQUEST - getAbortData call stack:', new Error().stack);
      debug(debugGroups.GENERAL, 'AGENTS/REQUEST - getAbortData called, closure variables:', {
        hasSender: !!sender,
        sender: sender,
        hasUserMessage: !!userMessage,
        hasPromptTokens: promptTokens !== undefined,
        promptTokens: promptTokens,
        hasConversationId: !!conversationId,
        conversationId: conversationId,
        hasResponseMessageId: !!responseMessageId,
        responseMessageId: responseMessageId,
        hasUserMessageId: !!userMessageId,
        userMessageId: userMessageId,
        hasUserMessagePromise: !!userMessagePromise
      });
      
      // Dereference WeakRef each time
      const content = contentRef.deref();

      const abortData = {
        sender: sender || 'Assistant',
        content: content || [],
        userMessage: userMessage || null,
        promptTokens: promptTokens || 0,
        conversationId: conversationId || null, // Ensure it's not undefined
        userMessagePromise: userMessagePromise || null,
        messageId: responseMessageId || null,
        parentMessageId: overrideParentMessageId ?? userMessageId ?? null,
      };
      
      debug(debugGroups.GENERAL, 'AGENTS/REQUEST - getAbortData returning:', {
        hasConversationId: !!abortData.conversationId,
        conversationId: abortData.conversationId,
        hasUserMessage: !!abortData.userMessage,
        messageId: abortData.messageId,
        abortDataKeys: Object.keys(abortData)
      });
      
      return abortData;
    };

    
    const { abortController, onStart } = createAbortController(req, res, getAbortData, getReqData);
    
    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Abort controller created:', {
      hasAbortController: !!abortController,
      hasOnStart: !!onStart
    });

    // Simple handler to avoid capturing scope
    const closeHandler = () => {
      logger.debug('[AgentController] Request closed');
      
      debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Close handler triggered:', {
        hasAbortController: !!abortController,
        isAlreadyAborted: abortController?.signal?.aborted,
        requestCompleted: abortController?.requestCompleted
      });
      
      if (!abortController) {
        return;
      } else if (abortController.signal.aborted) {
        return;
      } else if (abortController.requestCompleted) {
        return;
      }

      abortController.abort();
      logger.debug('[AgentController] Request aborted on close');
    };

    res.on('close', closeHandler);
    cleanupHandlers.push(() => {
      try {
        res.removeListener('close', closeHandler);
      } catch (e) {
        logger.error('[AgentController] Error removing close listener', e);
      }
    });

    // Create progress callback for streaming responses
    let { onProgress: progressCallback } = createOnProgress({});

    const messageOptions = {
      user: userId,
      onStart,
      getReqData,
      isContinued,
      isRegenerate,
      editedContent,
      conversationId: conversationId, // Use the potentially generated conversationId
      parentMessageId,
      userMessageId: userMessage?.messageId, // Add user message ID for response threading
      abortController,
      overrideParentMessageId,
      isEdited: !!editedContent,
      responseMessageId: editedResponseMessageId,
      onProgress: progressCallback,
      progressOptions: {
        res,
      },
      authToken: req.headers['Authorization']?.split(' ')[1] || req.headers['authorization']?.split(' ')[1]
    };
    
    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Message options IDs:', {
      parentMessageId: messageOptions.parentMessageId,
      userMessageId: messageOptions.userMessageId,
      conversationId: messageOptions.conversationId
    });

    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Conversation ID check:', {
      conversationId: messageOptions.conversationId,
      hasConversationId: !!messageOptions.conversationId
    });

    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Client and text analysis:', {
      clientType: client?.constructor?.name,
      hasText: !!text,
      textLength: text?.length,
      hasSendMessage: typeof client?.sendMessage === 'function'
    });

    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Final message options:', {
      hasConversationId: !!messageOptions.conversationId,
      conversationId: messageOptions.conversationId,
      hasParentMessageId: !!messageOptions.parentMessageId,
      parentMessageId: messageOptions.parentMessageId,
      userId: messageOptions.user,
      optionsKeys: Object.keys(messageOptions)
    });

    let response;
    try {
      response = await client.sendMessage(text, messageOptions);
    } catch (sendMessageError) {
      debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Error in client.sendMessage:', {
        errorMessage: sendMessageError.message,
        errorType: sendMessageError.constructor.name,
        hasStack: !!sendMessageError.stack
      });
      throw sendMessageError; // Re-throw to be handled by outer catch
    }

    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Client response received:', {
      hasResponse: !!response,
      responseKeys: response ? Object.keys(response) : 'no response',
      conversationId: response?.conversationId,
      messageId: response?.messageId
    });

    // Extract what we need and immediately break reference
    const messageId = response.messageId;
    const endpoint = endpointOption.endpoint;
    response.endpoint = endpoint;


    // Store database promise locally
    const databasePromise = response.databasePromise;
    delete response.databasePromise;

    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - About to resolve databasePromise:', {
      hasDatabasePromise: !!databasePromise
    });

    // Resolve database-related data with safety check (match EditController pattern)
    let convoData = {};
    if (databasePromise) {
      const { conversation: dbConvoData = {} } = await databasePromise;
      convoData = dbConvoData;
    } else {
      debug(debugGroups.GENERAL, 'AGENTS/REQUEST - No databasePromise, creating fallback conversation data');
      convoData = conversationId ? { id: conversationId, title: null } : {};
    }
    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Resolved databasePromise:', {
      hasConvoData: !!convoData,
      convoDataKeys: convoData ? Object.keys(convoData) : 'null',
      convoId: convoData?.id
    });
    
    const conversation = { ...convoData };
    conversation.title =
      conversation && !conversation.title ? null : conversation?.title || 'New Chat';
      
    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Final conversation object:', {
      hasConversation: !!conversation,
      conversationId: conversation?.id,
      title: conversation?.title
    });

    // Process files if needed
    if (req.body.files && client.options?.attachments) {
      userMessage.files = [];
      const messageFiles = new Set(req.body.files.map((file) => file.file_id));
      for (let attachment of client.options.attachments) {
        if (messageFiles.has(attachment.file_id)) {
          userMessage.files.push({ ...attachment });
        }
      }
      delete userMessage.image_urls;
    }
    
    if (!abortController.signal.aborted) {
      // Create a new response object with minimal copies
      const finalResponse = { ...response };

      // Create the event data with comprehensive debugging
      const eventData = {
        final: true,
        conversation,
        title: conversation.title,
        requestMessage: userMessage,
        responseMessage: finalResponse,
      };

      sendEvent(res, eventData);
      
      res.end();
      
      // Mark request as completed to prevent abort on close
      abortController.requestCompleted = true;

      // Save the message if needed
      if (client.savedMessageIds && !client.savedMessageIds.has(messageId)) {
        const messageToSave = { ...finalResponse, user: userId };
        debug(debugGroups.GENERAL, 'AGENTS/REQUEST - About to save message:', {
          hasConversationId: !!messageToSave.conversationId,
          conversationId: messageToSave.conversationId,
          messageId: messageToSave.messageId,
          hasText: !!messageToSave.text,
          messageKeys: Object.keys(messageToSave)
        });
        
        // Ensure conversationId is set from the original source if missing
        if (!messageToSave.conversationId && conversationId) {
          debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Adding missing conversationId from original:', conversationId);
          messageToSave.conversationId = conversationId;
        }
        
        // Now we should have a conversationId, so save the message
        if (!messageToSave.conversationId) {
          debug(debugGroups.GENERAL, 'AGENTS/REQUEST - WARNING: Still no conversationId, skipping save');
        } else {
          debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Saving message with conversationId:', messageToSave.conversationId);
          await saveMessage(
            req,
            messageToSave,
            { context: 'api/server/controllers/agents/request.js - response end' },
          );
        }
      }
    }

    // Save user message if needed
    if (!client.skipSaveUserMessage) {
      if (userMessage && typeof userMessage === 'object') {
        debug(debugGroups.GENERAL, 'AGENTS/REQUEST - About to save user message:', {
          hasUserMessage: !!userMessage,
          userMessageKeys: Object.keys(userMessage),
          conversationId: userMessage.conversationId
        });
        await saveMessage(req, userMessage, {
          context: "api/server/controllers/agents/request.js - don't skip saving user message",
        });
      } else {
        debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Skipping user message save - userMessage is undefined or invalid:', {
          userMessage: userMessage,
          userMessageType: typeof userMessage
        });
      }
    }


    // Add title if needed - extract minimal data and preserve client reference
    if (addTitle && parentMessageId === Constants.NO_PARENT && newConvo) {
      // Preserve client reference before cleanup for title generation
      const preservedClient = client;
      addTitle(req, {
        text,
        response: { ...response },
        client: preservedClient,
      })
        .then(() => {
          logger.debug('[AgentController] Title generation started');
        })
        .catch((err) => {
          debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Title generation error:', err.message);
          logger.error('[AgentController] Error in title generation', err);
        })
        .finally(() => {
          logger.debug('[AgentController] Title generation completed');
          performCleanup();
        });
    } else {
      performCleanup();
    }
    
  } catch (error) {
    // Handle error without capturing much scope
    debug(debugGroups.GENERAL, 'AGENTS/REQUEST - Caught error in main try/catch:', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      conversationIdAtError: conversationId,
      hasConversationId: !!conversationId
    });
    
    handleAbortError(res, req, error, {
      conversationId,
      sender,
      messageId: responseMessageId,
      parentMessageId: overrideParentMessageId ?? userMessageId ?? parentMessageId,
      userMessageId,
    })
      .catch((err) => {
        logger.error('[api/server/controllers/agents/request] Error in `handleAbortError`', err);
      })
      .finally(() => {
        performCleanup();
      });
  }
};

module.exports = AgentController;
