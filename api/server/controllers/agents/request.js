const { sendEvent } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { Constants } = require('librechat-data-provider');
const {
  handleAbortError,
  createAbortController,
  cleanupAbortController,
} = require('~/server/middleware');
const { disposeClient, clientRegistry, requestDataMap } = require('~/server/cleanup');
const { createOnProgress } = require('~/server/utils');
const { saveMessage } = require('~/models');

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

  console.log('DEBUG: AGENTS/REQUEST - Initial request body:', {
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

  console.log('DEBUG: AGENTS/REQUEST - Conversation state:', {
    newConvo: newConvo,
    hasConversationId: !!conversationId,
    conversationId: conversationId,
    userId: userId
  });

  // For new conversations, generate a conversationId
  if (newConvo) {
    const { v4: uuidv4 } = require('uuid');
    conversationId = uuidv4();
    console.log('DEBUG: AGENTS/REQUEST - Generated new conversationId for endpoint', endpointOption?.endpoint + ':', conversationId);
    
    // Update the request body to include the new conversationId
    req.body.conversationId = conversationId;
  }

  // Create userMessage early to prevent undefined errors during abort
  // Generate messageId for user message
  const crypto = require('crypto');
  const generatedUserMessageId = crypto.randomUUID();
  
  // Create the user message object early in the process
  const createdUserMessage = {
    messageId: generatedUserMessageId,
    parentMessageId: parentMessageId,
    conversationId: conversationId,
    sender: req.user?.name || 'User',
    text: text,
    isCreatedByUser: true,
    endpoint: endpointOption?.endpoint,
    createdAt: new Date(),
    user: userId
  };
  
  // Set userMessage early so it's available even if onStart doesn't get called
  userMessage = createdUserMessage;
  
  console.log('DEBUG: AGENTS/REQUEST - Created userMessage early:', {
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
          console.log('DEBUG: AGENTS/REQUEST - Updating userMessage from getReqData');
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

    console.log('DEBUG: AGENTS/REQUEST - After initializeClient:', {
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
      console.log('DEBUG: AGENTS/REQUEST - getAbortData called at:', new Date().toISOString());
      console.log('DEBUG: AGENTS/REQUEST - getAbortData call stack:', new Error().stack);
      console.log('DEBUG: AGENTS/REQUEST - getAbortData called, closure variables:', {
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
      
      console.log('DEBUG: AGENTS/REQUEST - getAbortData returning:', {
        hasConversationId: !!abortData.conversationId,
        conversationId: abortData.conversationId,
        hasUserMessage: !!abortData.userMessage,
        messageId: abortData.messageId,
        abortDataKeys: Object.keys(abortData)
      });
      
      return abortData;
    };

    console.log('DEBUG: AGENTS/REQUEST - About to create abort controller with getAbortData');
    
    const { abortController, onStart } = createAbortController(req, res, getAbortData, getReqData);
    
    console.log('DEBUG: AGENTS/REQUEST - Created abort controller:', {
      hasAbortController: !!abortController,
      hasOnStart: !!onStart
    });

    // Simple handler to avoid capturing scope
    const closeHandler = () => {
      console.log('DEBUG: AGENTS/REQUEST - closeHandler triggered');
      logger.debug('[AgentController] Request closed');
      
      console.log('DEBUG: AGENTS/REQUEST - closeHandler state check:', {
        hasAbortController: !!abortController,
        isAlreadyAborted: abortController?.signal?.aborted,
        requestCompleted: abortController?.requestCompleted
      });
      
      if (!abortController) {
        console.log('DEBUG: AGENTS/REQUEST - closeHandler: no abortController, returning');
        return;
      } else if (abortController.signal.aborted) {
        console.log('DEBUG: AGENTS/REQUEST - closeHandler: already aborted, returning');
        return;
      } else if (abortController.requestCompleted) {
        console.log('DEBUG: AGENTS/REQUEST - closeHandler: request completed, returning');
        return;
      }

      console.log('DEBUG: AGENTS/REQUEST - closeHandler: calling abortController.abort()');
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
      abortController,
      overrideParentMessageId,
      isEdited: !!editedContent,
      responseMessageId: editedResponseMessageId,
      onProgress: progressCallback,
      progressOptions: {
        res,
      },
    };

    console.log('DEBUG: AGENTS/REQUEST - Final messageOptions conversationId:', {
      conversationId: messageOptions.conversationId,
      hasConversationId: !!messageOptions.conversationId
    });

    console.log('DEBUG: AGENTS/REQUEST - About to call client.sendMessage:', {
      clientType: client?.constructor?.name,
      hasText: !!text,
      textLength: text?.length,
      hasSendMessage: typeof client?.sendMessage === 'function'
    });

    console.log('DEBUG: AGENTS/REQUEST - messageOptions:', {
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
      console.log('DEBUG: AGENTS/REQUEST - Error in client.sendMessage:', {
        errorMessage: sendMessageError.message,
        errorType: sendMessageError.constructor.name,
        hasStack: !!sendMessageError.stack
      });
      throw sendMessageError; // Re-throw to be handled by outer catch
    }

    console.log('DEBUG: AGENTS/REQUEST - sendMessage response:', {
      hasResponse: !!response,
      responseKeys: response ? Object.keys(response) : 'no response',
      conversationId: response?.conversationId,
      messageId: response?.messageId
    });

    // Extract what we need and immediately break reference
    const messageId = response.messageId;
    const endpoint = endpointOption.endpoint;
    response.endpoint = endpoint;

    console.log('DEBUG: AGENTS/REQUEST - After processing response:', {
      responseConversationId: response.conversationId,
      messageOptionsConversationId: messageOptions.conversationId,
      originalConversationId: conversationId,
      messageId: messageId
    });

    // Store database promise locally
    const databasePromise = response.databasePromise;
    delete response.databasePromise;

    console.log('DEBUG: AGENTS/REQUEST - About to resolve databasePromise:', {
      hasDatabasePromise: !!databasePromise
    });

    // Resolve database-related data with safety check
    let convoData = {};
    if (databasePromise) {
      const dbResult = await databasePromise;
      convoData = dbResult?.conversation || {};
    } else {
      console.log('DEBUG: AGENTS/REQUEST - No databasePromise, creating fallback conversation data');
      convoData = conversationId ? { id: conversationId, title: null } : {};
    }
    console.log('DEBUG: AGENTS/REQUEST - Resolved databasePromise:', {
      hasConvoData: !!convoData,
      convoDataKeys: convoData ? Object.keys(convoData) : 'null',
      convoId: convoData?.id
    });
    
    const conversation = { ...convoData };
    conversation.title =
      conversation && !conversation.title ? null : conversation?.title || 'New Chat';
      
    console.log('DEBUG: AGENTS/REQUEST - Final conversation object:', {
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

    // Only send if not aborted
    console.log('DEBUG: AGENTS/REQUEST - About to send final response, abort status:', {
      isAborted: abortController.signal.aborted,
      hasResponse: !!response,
      hasConversation: !!conversation,
      conversationId: conversation?.id
    });
    
    if (!abortController.signal.aborted) {
      // Create a new response object with minimal copies
      const finalResponse = { ...response };

      console.log('DEBUG: AGENTS/REQUEST - Sending final event to frontend:', {
        final: true,
        conversationId: conversation?.id,
        title: conversation?.title,
        hasRequestMessage: !!userMessage,
        hasResponseMessage: !!finalResponse,
        responseMessageId: finalResponse.messageId
      });

      // Create the event data with comprehensive debugging
      const eventData = {
        final: true,
        conversation,
        title: conversation.title,
        requestMessage: userMessage,
        responseMessage: finalResponse,
      };

      console.log('DEBUG: AGENTS/REQUEST - Complete sendEvent data structure:', {
        final: eventData.final,
        hasConversation: !!eventData.conversation,
        conversationStructure: eventData.conversation ? {
          id: eventData.conversation.id,
          title: eventData.conversation.title,
          conversationKeys: Object.keys(eventData.conversation)
        } : 'null',
        title: eventData.title,
        hasRequestMessage: !!eventData.requestMessage,
        requestMessageStructure: eventData.requestMessage ? {
          conversationId: eventData.requestMessage.conversationId,
          messageId: eventData.requestMessage.messageId,
          requestKeys: Object.keys(eventData.requestMessage)
        } : 'null',
        hasResponseMessage: !!eventData.responseMessage,
        responseMessageStructure: eventData.responseMessage ? {
          conversationId: eventData.responseMessage.conversationId,
          messageId: eventData.responseMessage.messageId,
          responseKeys: Object.keys(eventData.responseMessage)
        } : 'null',
        topLevelKeys: Object.keys(eventData)
      });

      console.log('DEBUG: AGENTS/REQUEST - About to call sendEvent with this exact data structure');
      sendEvent(res, eventData);
      
      console.log('DEBUG: AGENTS/REQUEST - Sent final event, calling res.end()');
      res.end();
      console.log('DEBUG: AGENTS/REQUEST - Called res.end(), setting requestCompleted flag');
      
      // Mark request as completed to prevent abort on close
      abortController.requestCompleted = true;
      console.log('DEBUG: AGENTS/REQUEST - Set abortController.requestCompleted = true');

      // Save the message if needed
      if (client.savedMessageIds && !client.savedMessageIds.has(messageId)) {
        const messageToSave = { ...finalResponse, user: userId };
        console.log('DEBUG: AGENTS/REQUEST - About to save message:', {
          hasConversationId: !!messageToSave.conversationId,
          conversationId: messageToSave.conversationId,
          messageId: messageToSave.messageId,
          hasText: !!messageToSave.text,
          messageKeys: Object.keys(messageToSave)
        });
        
        // Ensure conversationId is set from the original source if missing
        if (!messageToSave.conversationId && conversationId) {
          console.log('DEBUG: AGENTS/REQUEST - Adding missing conversationId from original:', conversationId);
          messageToSave.conversationId = conversationId;
        }
        
        // Now we should have a conversationId, so save the message
        if (!messageToSave.conversationId) {
          console.log('DEBUG: AGENTS/REQUEST - WARNING: Still no conversationId, skipping save');
        } else {
          console.log('DEBUG: AGENTS/REQUEST - Saving message with conversationId:', messageToSave.conversationId);
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
        console.log('DEBUG: AGENTS/REQUEST - About to save user message:', {
          hasUserMessage: !!userMessage,
          userMessageKeys: Object.keys(userMessage),
          conversationId: userMessage.conversationId
        });
        await saveMessage(req, userMessage, {
          context: "api/server/controllers/agents/request.js - don't skip saving user message",
        });
      } else {
        console.log('DEBUG: AGENTS/REQUEST - Skipping user message save - userMessage is undefined or invalid:', {
          userMessage: userMessage,
          userMessageType: typeof userMessage
        });
      }
    }

    console.log('DEBUG: AGENTS/REQUEST - Completed all message saving, checking for title generation');

    // Add title if needed - extract minimal data
    if (addTitle && parentMessageId === Constants.NO_PARENT && newConvo) {
      console.log('DEBUG: AGENTS/REQUEST - Starting title generation');
      addTitle(req, {
        text,
        response: { ...response },
        client,
      })
        .then(() => {
          console.log('DEBUG: AGENTS/REQUEST - Title generation completed successfully');
          logger.debug('[AgentController] Title generation started');
        })
        .catch((err) => {
          console.log('DEBUG: AGENTS/REQUEST - Title generation error:', err.message);
          logger.error('[AgentController] Error in title generation', err);
        })
        .finally(() => {
          console.log('DEBUG: AGENTS/REQUEST - Title generation finally block, calling cleanup');
          logger.debug('[AgentController] Title generation completed');
          performCleanup();
        });
    } else {
      console.log('DEBUG: AGENTS/REQUEST - No title generation needed, calling cleanup directly');
      performCleanup();
    }
    
    console.log('DEBUG: AGENTS/REQUEST - Reached end of main try block - request should be complete');
  } catch (error) {
    // Handle error without capturing much scope
    console.log('DEBUG: AGENTS/REQUEST - Caught error in main try/catch:', {
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
