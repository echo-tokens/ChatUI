const axios = require('axios');
const BaseClient = require('./BaseClient');
const { logger } = require('~/config');

class EchoStreamClient extends BaseClient {
  constructor(apiKey, options = {}) {
    console.log('DEBUG: EchoStreamClient constructor called with:', {
      apiKey: apiKey ? '***MASKED***' : 'null',
      baseURL: options.reverseProxyUrl,
      options: Object.keys(options)
    });
    
    super(apiKey, options);
    
    const baseURL = options.reverseProxyUrl || 'https://streaming-service.railway.internal';
    // Add your specific endpoint path here
    this.baseURL = `${baseURL}/api/chat/stream`;
    
    console.log('DEBUG: EchoStreamClient final URL:', this.baseURL);
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Service-Type': 'echo-proxy',
      'User-Agent': 'LibreChat/1.0',
      ...options.headers
    };
    
    this.addParams = options.addParams || {};
    this.sender = options.sender || 'Echo AI';
    
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
    console.log('DEBUG: EchoStreamClient buildMessages called with:', {
      messagesCount: messages?.length || 0,
      messages: messages,
      parentMessageId: parentMessageId,
      buildOptions: buildOptions,
      hasMessageOptions: !!messageOptions,
      messageOptionsKeys: messageOptions ? Object.keys(messageOptions) : 'null',
      conversationId: messageOptions?.conversationId
    });
    
    if (!messages || !Array.isArray(messages)) {
      console.log('DEBUG: EchoStreamClient buildMessages - Invalid messages input:', messages);
      return { payload: [] };
    }
    
    // Check if we need to get conversation history from database
    if (messageOptions?.conversationId && messageOptions.conversationId !== 'new') {
      try {
        console.log('DEBUG: EchoStreamClient buildMessages - Getting conversation history for:', messageOptions.conversationId);
        
        // Try to get conversation history like normal endpoints do
        const { getMessages } = require('~/models');
        const conversationMessages = await getMessages({ 
          conversationId: messageOptions.conversationId 
        });
        
        console.log('DEBUG: EchoStreamClient buildMessages - Retrieved conversation messages:', {
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
          
          console.log('DEBUG: EchoStreamClient buildMessages - Built full conversation:', {
            historyCount: historyMessages.length,
            currentCount: currentMessages.length,
            totalCount: fullMessages.length,
            preview: fullMessages.map(m => `${m.role}: ${m.content?.substring(0, 30)}...`)
          });
          
          return { payload: fullMessages };
        }
      } catch (error) {
        console.log('DEBUG: EchoStreamClient buildMessages - Error getting conversation history:', error.message);
      }
    }
    
    // Fallback to just current messages
    const apiMessages = messages.map(msg => ({
      role: msg.isCreatedByUser ? 'user' : 'assistant',
      content: msg.text || msg.content
    }));
    
    console.log('DEBUG: EchoStreamClient buildMessages - Using current messages only:', {
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

    console.log('DEBUG: EchoStreamClient chatCompletion called with payload:', JSON.stringify(payload, null, 2));
    console.log('DEBUG: EchoStreamClient: Full request details:', {
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

      console.log('DEBUG: EchoStreamClient: Got response status:', response.status);
      console.log('DEBUG: EchoStreamClient: Response headers:', response.headers);

      const result = await this.handleStreamResponse(response.data, onProgress);
      console.log('DEBUG: EchoStreamClient returning result:', result);
      return result;
    } catch (error) {
      console.log('DEBUG: EchoStreamClient error:', error.message);
      console.log('DEBUG: EchoStreamClient error stack:', error.stack);
      console.log('DEBUG: EchoStreamClient error name:', error.name);
      console.log('DEBUG: EchoStreamClient error details:', {
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
          console.log('DEBUG: Attempting to read error response stream...');
          try {
            const chunks = [];
            error.response.data.on('data', chunk => chunks.push(chunk));
            error.response.data.on('end', () => {
              const responseText = Buffer.concat(chunks).toString();
              console.log('DEBUG: Error response body:', responseText);
            });
          } catch (streamError) {
            console.log('DEBUG: Failed to read error stream:', streamError.message);
          }
        }
      }
      
      // Check if this is the conversationId error we're looking for
      if (error.message && error.message.includes("Cannot read properties of undefined (reading 'conversationId')")) {
        console.log('DEBUG: This is the conversationId error! Error came from axios/streaming');
        console.log('DEBUG: Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
      
      throw new Error(`Echo Stream API error: ${error.message}`);
    }
  }

  async handleStreamResponse(stream, onProgress) {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let buffer = '';

      stream.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        console.log(`DEBUG: Received chunk (${chunkStr.length} chars):`, chunkStr.substring(0, 200) + (chunkStr.length > 200 ? '...' : ''));
        
        buffer += chunkStr;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        console.log(`DEBUG: Processing ${lines.length} lines from chunk`);
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              console.log('DEBUG: Received [DONE], ending stream');
              resolve({ text: fullResponse || 'No response received' });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              console.log('DEBUG: Raw parsed object:', JSON.stringify(parsed, null, 2));
              const content = parsed.choices?.[0]?.delta?.content;
              
              // Check if this parsed object has any conversationId reference that might be undefined
              if (parsed && typeof parsed === 'object') {
                Object.keys(parsed).forEach(key => {
                  if (key.includes('conversation') || key.includes('Conversation')) {
                    console.log(`DEBUG: Found conversation-related key: ${key}:`, parsed[key]);
                  }
                });
              }
              
              console.log('DEBUG: Parsed SSE data:', { 
                content: content ? `"${content}"` : 'undefined',
                hasChoices: !!parsed.choices,
                parsedKeys: Object.keys(parsed)
              });
              
              if (content) {
                fullResponse += content;
                
                // Call onProgress callback if provided
                if (onProgress) {
                  onProgress(content, { type: 'stream' });
                }
              }
            } catch (parseError) {
              console.log('DEBUG: Failed to parse SSE data:', data, 'Error:', parseError.message);
              logger.warn('EchoStreamClient: Failed to parse SSE data', parseError);
            }
          }
        }
      });

      stream.on('end', () => {
        console.log('DEBUG: Stream ended, fullResponse length:', fullResponse.length);
        console.log('DEBUG: Buffer remaining:', buffer);
        const result = { text: fullResponse || 'Stream ended with no content' };
        console.log('DEBUG: Resolving with result:', result);
        resolve(result);
      });

      stream.on('error', (error) => {
        console.log('DEBUG: Stream error:', error.message);
        console.log('DEBUG: Stream error stack:', error.stack);
        console.log('DEBUG: Stream error name:', error.name);
        console.log('DEBUG: Stream error full object:', error);
        logger.error('EchoStreamClient: Stream error', error);
        reject(error);
      });
      
      stream.on('close', () => {
        console.log('DEBUG: Stream closed, fullResponse length:', fullResponse.length);
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
    console.log('DEBUG: EchoStreamClient sendMessage called with:', {
      text: text?.substring(0, 100) + '...',
      hasMessageOptions: !!messageOptions,
      optionsKeys: Object.keys(messageOptions)
    });

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
      console.log('DEBUG: EchoStreamClient - Built messages using buildMessages:', messages?.length || 0, 'messages');
    } catch (error) {
      console.log('DEBUG: EchoStreamClient - Error with buildMessages, falling back to simple message:', error.message);
      // Fallback to simple message format
      messages = [{ role: 'user', content: text }];
    }

    // Create a payload in the expected format
    const payload = {
      messages: messages,
      model: this.modelOptions?.model || 'gpt-4o-mini', // fallback model
      ...this.modelOptions
    };

    console.log('DEBUG: EchoStreamClient calling chatCompletion with payload:', payload);

    // Call the chatCompletion method
    const result = await this.chatCompletion({
      payload,
      onProgress: messageOptions.onProgress,
      abortController: messageOptions.abortController
    });

    console.log('DEBUG: EchoStreamClient sendMessage result:', result);
    console.log('DEBUG: EchoStreamClient messageOptions details:', {
      conversationId: messageOptions.conversationId,
      responseMessageId: messageOptions.responseMessageId,
      hasConversationId: !!messageOptions.conversationId,
      messageOptionsKeys: Object.keys(messageOptions)
    });

    // Generate a messageId if not provided (frontend needs this for proper routing)
    const responseMessageId = messageOptions.responseMessageId || require('crypto').randomUUID();
    
    // Ensure conversationId is always valid - generate one if missing
    const conversationId = messageOptions.conversationId || require('crypto').randomUUID();
    
    console.log('DEBUG: EchoStreamClient - Final response ID handling:', {
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
    
    console.log('DEBUG: EchoStreamClient - Response message parentMessageId set to userMessageId:', {
      responseParentMessageId: responseMessage.parentMessageId,
      providedUserMessageId: messageOptions.userMessageId,
      originalParentMessageId: messageOptions.parentMessageId
    });

    console.log('DEBUG: EchoStreamClient - About to save response message to database:', {
      messageId: responseMessage.messageId,
      conversationId: responseMessage.conversationId,
      hasText: !!responseMessage.text,
      endpoint: responseMessage.endpoint
    });

    // Create databasePromise like BaseClient does - save response message to database
    const saveOptions = this.getSaveOptions();
    const user = messageOptions.user;
    
    console.log('DEBUG: EchoStreamClient - Creating databasePromise to save response message');
    
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

    console.log('DEBUG: EchoStreamClient final response:', {
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