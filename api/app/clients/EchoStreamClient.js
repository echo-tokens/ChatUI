const axios = require('axios');
const BaseClient = require('./BaseClient');
const { logger } = require('~/config');
const { debug, debugGroups } = require('~/server/utils/debug');

class EchoStreamClient extends BaseClient {
  constructor(apiKey, options = {}) {
    debug(debugGroups.GENERAL, 'EchoStreamClient constructor called with:', {
      apiKey: apiKey ? '***MASKED***' : 'null',
      baseURL: options.reverseProxyUrl,
      options: Object.keys(options)
    });
    
    super(apiKey, options);
    
    const baseURL = options.reverseProxyUrl || 'https://streaming-service.railway.internal';
    // Add your specific endpoint path here
    this.baseURL = `${baseURL}/api/chat/stream`;
    
    debug(debugGroups.GENERAL, 'EchoStreamClient final URL:', this.baseURL);
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Service-Type': 'echo-proxy',
      'User-Agent': 'LibreChat/1.0',
      ...options.headers
    };
    
    this.addParams = options.addParams || {};
    this.sender = options.sender || 'Echo';
    
    // Call setOptions like normal endpoints do to set up this.options properly
    this.setOptions(options);
  }

  setOptions(options) {
    if (this.options && !this.options.replaceOptions) {
      this.options = {
        ...this.options,
        ...options,
      };
    } else {
      this.options = options;
    }
    
    // Set up modelOptions like normal endpoints
    this.modelOptions = this.options.modelOptions || {};
    
    return this;
  }

  async buildMessages(messages, parentMessageId, buildOptions, messageOptions) {
    // Simple buildMessages implementation for custom endpoint with extensive debugging
    debug(debugGroups.GENERAL, 'buildMessages called with:', {
      messagesCount: messages?.length || 0,
      messages: messages,
      parentMessageId: parentMessageId,
      buildOptions: buildOptions,
      hasMessageOptions: !!messageOptions,
      messageOptionsKeys: messageOptions ? Object.keys(messageOptions) : 'null',
      conversationId: messageOptions?.conversationId
    });
    
    if (!messages || !Array.isArray(messages)) {
      debug(debugGroups.GENERAL, 'buildMessages - Invalid messages input:', messages);
      return { payload: [] };
    }
    
    // Check if we need to get conversation history from database
    if (messageOptions?.conversationId && messageOptions.conversationId !== 'new') {
      try {
        debug(debugGroups.GENERAL, 'buildMessages - Getting conversation history for:', messageOptions.conversationId);
        
        // Try to get conversation history like normal endpoints do
        const { getMessages } = require('~/models');
        const conversationMessages = await getMessages({ 
          conversationId: messageOptions.conversationId 
        });
        
        debug(debugGroups.GENERAL, 'buildMessages - Retrieved conversation messages:', {
          count: conversationMessages?.length || 0,
          messages: conversationMessages?.map(m => ({
            id: m.messageId,
            isUser: m.isCreatedByUser,
            text: m.text?.substring(0, 50) + '...'
          }))
        });
        
        if (conversationMessages && conversationMessages.length > 0) {
          // Build full conversation history
          const historyMessages = conversationMessages.map(msg => ({
            role: msg.isCreatedByUser ? 'user' : 'assistant',
            content: msg.text || msg.content
          }));
          
          // Add current message to history
          const currentMessages = messages.map(msg => ({
            role: msg.isCreatedByUser ? 'user' : 'assistant',
            content: msg.text || msg.content
          }));
          
          const fullMessages = [...historyMessages, ...currentMessages];
          
          debug(debugGroups.GENERAL, 'buildMessages - Built full conversation:', {
            historyCount: historyMessages.length,
            currentCount: currentMessages.length,
            totalCount: fullMessages.length,
            preview: fullMessages.map(m => `${m.role}: ${m.content?.substring(0, 30)}...`)
          });
          
          return { payload: fullMessages };
        }
      } catch (error) {
        debug(debugGroups.GENERAL, 'buildMessages - Error getting conversation history:', error.message);
      }
    }
    
    // Fallback to just current messages
    const apiMessages = messages.map(msg => ({
      role: msg.isCreatedByUser ? 'user' : 'assistant',
      content: msg.text || msg.content
    }));
    
    debug(debugGroups.GENERAL, 'buildMessages - Using current messages only:', {
      inputCount: messages.length,
      outputCount: apiMessages.length,
      preview: apiMessages.map(m => `${m.role}: ${m.content?.substring(0, 30)}...`)
    });
    
    return { payload: apiMessages };
  }

  async chatCompletion({ payload, onProgress, abortController = null }) {
    const requestPayload = {
      ...payload,
      stream: true,
      include_ads: true,
      ...this.addParams
    };

    debug(debugGroups.STREAMING, 'chatCompletion called with payload:', JSON.stringify(payload, null, 2));
    debug(debugGroups.STREAMING, 'Full request details:', {
      url: this.baseURL,
      method: 'POST',
      headers: this.headers,
      payload: requestPayload
    });
    logger.info('EchoStreamClient: Sending request to', this.baseURL);
    logger.debug('EchoStreamClient: Request payload', requestPayload);

    try {
      const response = await axios({
        method: 'POST',
        url: this.baseURL,
        headers: this.headers,
        data: requestPayload,
        timeout: 120000,
        responseType: 'stream',
        signal: abortController?.signal
      });

      debug(debugGroups.STREAMING, 'Got response status:', response.status);

      const result = await this.handleStreamResponse(response.data, onProgress);
      debug(debugGroups.STREAMING, 'Returning result:', result);
      return result;
    } catch (error) {
      debug(debugGroups.STREAMING, 'EchoStreamClient error:', error.message);
      debug(debugGroups.STREAMING, 'EchoStreamClient error stack:', error.stack);
      debug(debugGroups.STREAMING, 'EchoStreamClient error name:', error.name);
      debug(debugGroups.STREAMING, 'EchoStreamClient error details:', {
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseHeaders: error.response?.headers,
        hasResponseData: !!error.response?.data
      });
      
      logger.error('EchoStreamClient: Request failed', error);
      
      if (error.response) {
        logger.error('EchoStreamClient: Response status', error.response.status);
        logger.error('EchoStreamClient: Response data', error.response.data);
        
        // Try to read response data if it's a stream
        if (error.response.data && typeof error.response.data.read === 'function') {
          debug(debugGroups.STREAMING, 'Attempting to read error response stream...');
          try {
            const chunks = [];
            error.response.data.on('data', chunk => chunks.push(chunk));
            error.response.data.on('end', () => {
              const responseText = Buffer.concat(chunks).toString();
              debug(debugGroups.STREAMING, 'Error response body:', responseText);
            });
          } catch (streamError) {
            debug(debugGroups.STREAMING, 'Failed to read error stream:', streamError.message);
          }
        }
      }
      
      // Check if this is the conversationId error we're looking for
      if (error.message && error.message.includes("Cannot read properties of undefined (reading 'conversationId')")) {
        debug(debugGroups.STREAMING, 'This is the conversationId error! Error came from axios/streaming');
        debug(debugGroups.STREAMING, 'Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
      
      throw new Error(`Echo Stream API error: ${error.message}`);
    }
  }

  async handleStreamResponse(stream, onProgress) {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let buffer = '';
      let chunkCount = 0;
      let totalBytesReceived = 0;

      stream.on('data', (chunk) => {
        chunkCount++;
        totalBytesReceived += chunk.length;
        const chunkStr = chunk.toString();
        const timestamp = new Date().toISOString();
        
        debug(debugGroups.STREAMING, `CHUNK #${chunkCount} received (${chunkStr.length} chars, ${chunk.length} bytes total: ${totalBytesReceived})`);
        
        buffer += chunkStr;
        
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            debug(debugGroups.SSE, `Extracted SSE data: "${data}"`);
            
            if (data === '[DONE]') {
              debug(debugGroups.STREAMING, 'Received [DONE], ending stream');
              resolve({ text: fullResponse || 'No response received' });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              // Check if this parsed object has any conversationId reference that might be undefined
              if (parsed && typeof parsed === 'object') {
                Object.keys(parsed).forEach(key => {
                  if (key.includes('conversation') || key.includes('Conversation')) {
                    debug(debugGroups.GENERAL, `Found conversation-related key: ${key}:`, parsed[key]);
                  }
                });
              }
              
              debug(debugGroups.SSE, 'Parsed SSE data:', { 
                content: content ? `"${content}"` : 'undefined',
                hasChoices: !!parsed.choices,
                parsedKeys: Object.keys(parsed)
              });
              
              if (content) {
                fullResponse += content;
                debug(debugGroups.STREAMING, `Received streaming content: "${content}" (${content.length} chars, total so far: ${fullResponse.length} chars)`);
                
                // Call onProgress callback if provided
                if (onProgress) {
                  // Check if onProgress is already configured or needs configuration
                  if (typeof onProgress === 'function' && onProgress.length === 1) {
                    // This is a raw progressCallback that needs configuration
                    // We need to configure it with the proper parameters
                    const { progressOptions } = this.currentMessageOptions || {};
                    if (progressOptions && progressOptions.res && this.responseMessageId && this.conversationId) {
                      debug(debugGroups.MESSAGE_FLOW, 'Configuring and calling onProgress callback for streaming');
                      debug(debugGroups.MESSAGE_FLOW, 'IDs being used:', {
                        responseMessageId: this.responseMessageId,
                        conversationId: this.conversationId,
                        messageOptionsConversationId: this.currentMessageOptions?.conversationId
                      });
                      const configuredCallback = onProgress({
                        res: progressOptions.res,
                        messageId: this.responseMessageId,
                        conversationId: this.conversationId,
                        conversation: { id: this.conversationId },
                        type: 'stream'
                      });
                      debug(debugGroups.MESSAGE_FLOW, 'About to call configuredCallback with content:', JSON.stringify(content));
                      configuredCallback(content);
                      debug(debugGroups.MESSAGE_FLOW, 'Called configuredCallback, checking if SSE was sent');
                      
                      // Check if response is still writable
                      debug(debugGroups.SSE, 'Response writable?', !progressOptions.res.destroyed && progressOptions.res.writable);
                    } else {
                      debug(debugGroups.MESSAGE_FLOW, 'Missing required data for onProgress configuration:', {
                        hasProgressOptions: !!progressOptions,
                        hasRes: !!(progressOptions && progressOptions.res),
                        hasResponseMessageId: !!this.responseMessageId,
                        hasConversationId: !!this.conversationId
                      });
                    }
                  } else {
                    // Already configured, just call it
                    debug(debugGroups.MESSAGE_FLOW, 'Calling pre-configured onProgress callback');
                    onProgress(content, { type: 'stream' });
                  }
                } else {
                  debug(debugGroups.MESSAGE_FLOW, 'No onProgress callback provided, accumulating content only');
                }
              }
            } catch (parseError) {
              debug(debugGroups.SSE, 'Failed to parse SSE data:', data, 'Error:', parseError.message);
              logger.warn('EchoStreamClient: Failed to parse SSE data', parseError);
            }
          } else if (line.trim() !== '') {
            debug(debugGroups.SSE, `Non-SSE line (ignored): "${line}"`);
          }
        }
      });

      stream.on('end', () => {
        const timestamp = new Date().toISOString();
        debug(debugGroups.STREAMING, 'Stream ended');
        debug(debugGroups.STREAMING, 'Final stats:', {
          totalChunks: chunkCount,
          totalBytes: totalBytesReceived,
          fullResponseLength: fullResponse.length,
          bufferRemaining: buffer.length
        });
        debug(debugGroups.STREAMING, 'Buffer remaining:', JSON.stringify(buffer));
        const result = { text: fullResponse || 'Stream ended with no content' };
        debug(debugGroups.STREAMING, 'Resolving with result:', result);
        resolve(result);
      });

      stream.on('error', (error) => {
        const timestamp = new Date().toISOString();
        debug(debugGroups.STREAMING, 'Stream error:', error.message);
        debug(debugGroups.STREAMING, 'Stream error stack:', error.stack);
        debug(debugGroups.STREAMING, 'Stream error name:', error.name);
        debug(debugGroups.STREAMING, 'Stream error full object:', error);
        logger.error('EchoStreamClient: Stream error', error);
        reject(error);
      });
      
      stream.on('close', () => {
        const timestamp = new Date().toISOString();
        debug(debugGroups.STREAMING, 'Stream closed');
        debug(debugGroups.STREAMING, 'Final close stats:', {
          totalChunks: chunkCount,
          totalBytes: totalBytesReceived,
          fullResponseLength: fullResponse.length
        });
      });
    });
  }


  // Implement required BaseClient methods
  async getTokenCount(text) {
    // Simple token estimation (4 chars ≈ 1 token)
    return Math.ceil(text.length / 4);
  }

  getTokenizer() {
    return {
      encode: (text) => text.split(''),
      decode: (tokens) => tokens.join('')
    };
  }

  async sendMessage(text, messageOptions = {}) {
    debug(debugGroups.GENERAL, 'sendMessage called with:', {
      text: text?.substring(0, 100) + '...',
      hasMessageOptions: !!messageOptions,
      optionsKeys: Object.keys(messageOptions)
    });

    // Store messageOptions for use in streaming
    this.currentMessageOptions = messageOptions;

    // Follow BaseClient pattern - use buildMessages to get conversation history
    let messages;
    try {
      // Create a user message for the current input
      const userMessage = {
        text: text,
        isCreatedByUser: true,
        messageId: require('crypto').randomUUID(),
        conversationId: messageOptions.conversationId,
        parentMessageId: messageOptions.parentMessageId
      };

      // Get conversation messages following BaseClient pattern
      const { payload } = await this.buildMessages(
        [userMessage], // Current message
        messageOptions.parentMessageId,
        {}, 
        messageOptions
      );
      
      messages = payload;
      debug(debugGroups.GENERAL, 'Built messages using buildMessages:', messages?.length || 0, 'messages');
    } catch (error) {
      debug(debugGroups.GENERAL, 'Error with buildMessages, falling back to simple message:', error.message);
      // Fallback to simple message format
      messages = [{ role: 'user', content: text }];
    }

    // Create a payload in the expected format
    const payload = {
      messages: messages,
      model: this.modelOptions?.model || 'gpt-4o-mini', // fallback model
      ...this.modelOptions
    };

    debug(debugGroups.STREAMING, 'calling chatCompletion with payload:', payload);

    // Store the response message ID and conversation ID for streaming
    this.responseMessageId = messageOptions.responseMessageId || require('crypto').randomUUID();
    this.conversationId = messageOptions.conversationId || require('crypto').randomUUID();
    
    debug(debugGroups.MESSAGE_FLOW, 'EchoStreamClient IDs set:', {
      responseMessageId: this.responseMessageId,
      conversationId: this.conversationId,
      providedResponseMessageId: messageOptions.responseMessageId,
      providedConversationId: messageOptions.conversationId,
      generatedNew: {
        responseMessageId: !messageOptions.responseMessageId,
        conversationId: !messageOptions.conversationId
      }
    });

    // Call the chatCompletion method
    const result = await this.chatCompletion({
      payload,
      onProgress: messageOptions.onProgress,
      abortController: messageOptions.abortController
    });

    debug(debugGroups.STREAMING, 'sendMessage result:', result);
    debug(debugGroups.MESSAGE_FLOW, 'messageOptions details:', {
      conversationId: messageOptions.conversationId,
      responseMessageId: messageOptions.responseMessageId,
      hasConversationId: !!messageOptions.conversationId,
      messageOptionsKeys: Object.keys(messageOptions)
    });

    // Use the stored IDs that were set in sendMessage
    const responseMessageId = this.responseMessageId;
    const conversationId = this.conversationId;
    
    debug(debugGroups.MESSAGE_FLOW, 'Final response ID handling:', {
      providedMessageId: messageOptions.responseMessageId,
      generatedMessageId: responseMessageId,
      willUseGeneratedMessageId: !messageOptions.responseMessageId,
      providedConversationId: messageOptions.conversationId,
      finalConversationId: conversationId,
      conversationIdWasGenerated: !messageOptions.conversationId,
      userMessageParentMessageId: messageOptions.parentMessageId
    });

    // Create response message like BaseClient does
    // Set parentMessageId to user message ID for proper threading in database
    const responseMessage = {
      text: result.text,
      messageId: responseMessageId,
      conversationId: conversationId,
      endpoint: 'echo_stream',
      isCreatedByUser: false,
      error: false,
      model: this.modelOptions?.model || 'echo-stream',
      sender: this.sender,
      parentMessageId: messageOptions.userMessageId // Use user message ID as parent
    };
    
    debug(debugGroups.MESSAGE_FLOW, 'Created final responseMessage:', {
      messageId: responseMessage.messageId,
      conversationId: responseMessage.conversationId,
      sender: responseMessage.sender,
      textLength: responseMessage.text?.length,
      parentMessageId: responseMessage.parentMessageId,
      endpoint: responseMessage.endpoint
    });
    
    debug(debugGroups.MESSAGE_FLOW, 'Response message parentMessageId set to userMessageId:', {
      responseParentMessageId: responseMessage.parentMessageId,
      providedUserMessageId: messageOptions.userMessageId,
      originalParentMessageId: messageOptions.parentMessageId
    });

    debug(debugGroups.GENERAL, 'About to save response message to database:', {
      messageId: responseMessage.messageId,
      conversationId: responseMessage.conversationId,
      hasText: !!responseMessage.text,
      endpoint: responseMessage.endpoint
    });

    // Create databasePromise like BaseClient does - save response message to database
    const saveOptions = this.getSaveOptions();
    const user = messageOptions.user;
    
    debug(debugGroups.GENERAL, 'Creating databasePromise to save response message');
    
    responseMessage.databasePromise = this.saveMessageToDatabase(
      responseMessage,
      saveOptions,
      user
    );
    
    // Add to saved message IDs like BaseClient does
    if (!this.savedMessageIds) {
      this.savedMessageIds = new Set();
    }
    this.savedMessageIds.add(responseMessage.messageId);

    const response = responseMessage;

    debug(debugGroups.MESSAGE_FLOW, 'final response:', {
      hasText: !!response.text,
      textLength: response.text?.length,
      messageId: response.messageId,
      conversationId: response.conversationId,
      hasDbPromise: !!response.databasePromise
    });

    return response;
  }

  async titleConvo({ text, responseText = '' }) {
    // Simple title generation for echo_stream - just return default title
    return 'Echo Stream Chat';
  }

  getSaveOptions() {
    return {
      modelLabel: 'Echo Stream',
      endpoint: 'echo_stream'
    };
  }
}

module.exports = EchoStreamClient;