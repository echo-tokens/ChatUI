const axios = require('axios');
const BaseClient = require('./BaseClient');
const { logger } = require('~/config');
const { debug, debugGroups } = require('~/server/utils/debug');
const { SplitStreamHandler } = require('@librechat/agents');
const { createStreamEventHandlers } = require('@librechat/api');

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

  /** @type {sendCompletion} */
  async sendCompletion(payload, opts = {}) {
    let reply = '';
    const requestPayload = {
      messages: payload,
      stream: true,
      include_ads: true,
      ...this.addParams
    };

    debug(debugGroups.STREAMING, 'sendCompletion called with payload:', JSON.stringify(payload, null, 2));
    debug(debugGroups.STREAMING, 'Full request details:', {
      url: this.baseURL,
      method: 'POST',
      headers: this.headers,
      payload: requestPayload
    });
    logger.info('EchoStreamClient: Sending request to', this.baseURL);
    logger.debug('EchoStreamClient: Request payload', requestPayload);

    if (typeof opts.onProgress === 'function') {
      // Initialize stream handler like normal endpoints
      const handlers = createStreamEventHandlers(this.options.res);
      this.streamHandler = new SplitStreamHandler({
        accumulate: true,
        runId: this.responseMessageId,
        handlers,
      });
    }

    try {
      const response = await axios({
        method: 'POST',
        url: this.baseURL,
        headers: this.headers,
        data: requestPayload,
        timeout: 120000,
        responseType: 'stream',
        signal: opts.abortController?.signal
      });

      debug(debugGroups.STREAMING, 'Got response status:', response.status);

      if (typeof opts.onProgress === 'function') {
        reply = await this.handleStreamResponseWithSSE(response.data, opts.onProgress);
      } else {
        reply = await this.handleStreamResponseBasic(response.data);
      }

      debug(debugGroups.STREAMING, 'Returning result:', reply);
      return reply.trim();
    } catch (error) {
      debug(debugGroups.STREAMING, 'EchoStreamClient error:', error.message);
      logger.error('EchoStreamClient: Request failed', error);
      throw new Error(`Echo Stream API error: ${error.message}`);
    }
  }

  async handleStreamResponseWithSSE(stream, onProgress) {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let buffer = '';
      let chunkCount = 0;

      stream.on('data', (chunk) => {
        chunkCount++;
        const chunkStr = chunk.toString();
        debug(debugGroups.STREAMING, `CHUNK #${chunkCount} received (${chunkStr.length} chars)`);
        
        buffer += chunkStr;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            debug(debugGroups.SSE, `Extracted SSE data: "${data}"`);
            
            if (data === '[DONE]') {
              debug(debugGroups.STREAMING, 'Received [DONE], ending stream');
              resolve(fullResponse || 'No response received');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              debug(debugGroups.SSE, 'Parsed SSE data:', { 
                content: content ? `"${content}"` : 'undefined',
                hasChoices: !!parsed.choices,
                parsedKeys: Object.keys(parsed)
              });
              
              if (content) {
                fullResponse += content;
                debug(debugGroups.STREAMING, `Received streaming content: "${content}" (${content.length} chars, total: ${fullResponse.length})`);
                
                // Use SplitStreamHandler pattern like normal endpoints
                if (this.streamHandler) {
                  // Create a chunk in OpenAI format for SplitStreamHandler
                  const openAIChunk = {
                    choices: [{
                      delta: { content },
                      finish_reason: null
                    }]
                  };
                  this.streamHandler.handle(openAIChunk);
                } else if (onProgress) {
                  // Fallback: call onProgress directly (should not happen with proper setup)
                  onProgress(content);
                }
              }
            } catch (parseError) {
              debug(debugGroups.SSE, 'Failed to parse SSE data:', data, 'Error:', parseError.message);
              logger.warn('EchoStreamClient: Failed to parse SSE data', parseError);
            }
          }
        }
      });

      stream.on('end', () => {
        debug(debugGroups.STREAMING, 'Stream ended');
        debug(debugGroups.STREAMING, 'Final response length:', fullResponse.length);
        resolve(fullResponse || 'Stream ended with no content');
      });

      stream.on('error', (error) => {
        debug(debugGroups.STREAMING, 'Stream error:', error.message);
        logger.error('EchoStreamClient: Stream error', error);
        reject(error);
      });
    });
  }

  async handleStreamResponseBasic(stream) {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let buffer = '';

      stream.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        buffer += chunkStr;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              resolve(fullResponse || 'No response received');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
              }
            } catch (parseError) {
              // Ignore parse errors for basic handling
            }
          }
        }
      });

      stream.on('end', () => {
        resolve(fullResponse || 'Stream ended with no content');
      });

      stream.on('error', reject);
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