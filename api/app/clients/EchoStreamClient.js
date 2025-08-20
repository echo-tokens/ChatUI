const axios = require('axios');
const BaseClient = require('./BaseClient');
const { logger } = require('~/config');
const { debug, debugGroups } = require('~/server/utils/debug');
const { SplitStreamHandler } = require('@librechat/agents');
const { createStreamEventHandlers } = require('@librechat/api');
const { jwtVerify } = require('jose');
const { supabase } = require('~/lib/supabase');

class EchoStreamClient extends BaseClient {
  constructor(apiKey, options = {}) {
    debug(debugGroups.GENERAL, 'EchoStreamClient constructor called with:', {
      baseURL: options.reverseProxyUrl,
      options: Object.keys(options)
    });
    
    super(apiKey, options);
    
    const baseURL = options.reverseProxyUrl || 'https://streaming-service.railway.internal';
    // Add your specific endpoint path here
    this.baseURL = `${baseURL}/api/chat/stream`;
    
    debug(debugGroups.GENERAL, 'EchoStreamClient final URL:', this.baseURL);
    this.headers = {
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
      return { prompt: [] };
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
          
          return { prompt: fullMessages };
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
    
    return { prompt: apiMessages };
  }

  // async getUserIDFromToken(token) {
  //   // Retrieve API key for this specific user id from supabase, where user_id is retrieved via JWT
  //   if (token) {
  //     try {
  //       const secret = new TextEncoder().encode(process.env.CHAT_UI_JWT_SECRET);
  //       try {
  //         const { payload } = await jwtVerify(token, secret);
  //         return payload.id;
  //       } catch (err) {
  //         debug(debugGroups.GENERAL, 'JWT verification failed:', err.message);
  //         throw new Error('Error verifying JWT');
  //       }
  //     } catch (err) {
  //       debug(debugGroups.GENERAL, 'Error verifying JWT:', err.message);
  //       throw new Error('Error verifying JWT');
  //     }
  //   } else {
  //     debug(debugGroups.GENERAL, 'No auth token found');
  //     throw new Error('No auth token found');
  //   }
  // }

  // async getUserAPIKeyFromUserID(userId) {
  //   if (userId) {
  //     try {
  //       debug(debugGroups.MESSAGE_FLOW, 'Fetching user API key for user ID:', userId);
  //       const { data, error } = await supabase
  //         .from('streaming_service_api_keys')
  //         .select('api_key')
  //         .eq('user_id', userId)
  //         .eq('active', true)
  //         .single();
  //       if (error) {
  //         debug(debugGroups.GENERAL, 'Error fetching user API key:', error.message);
  //         throw new Error('Error fetching user API key');
  //       } else if (data && data.api_key) {
  //         debug(debugGroups.GENERAL, `Fetched API key for user ${userId}`);
  //         return data.api_key;
  //       }
  //     } catch (err) {
  //       debug(debugGroups.GENERAL, 'Exception fetching user API key:', err.message);
  //       throw new Error('Error fetching user API key');
  //     }
  //   } else {
  //     debug(debugGroups.GENERAL, 'No user ID found');
  //     throw new Error('No user ID found');
  //   }
  // }

  // async getUserApiKeyFromToken(token) {
  //   // Retrieve API key for this specific user id from supabase, where user_id is retrieved via JWT
  //   const userId = await this.getUserIDFromToken(token);
  //   return this.getUserAPIKeyFromUserID(userId);
  // }

  /** @type {sendCompletion} */
  async sendCompletion(payload, opts = {}) {
    let reply = '';
    const requestPayload = {
      messages: payload,
      model: this.modelOptions?.model || 'gpt-4o-mini', // Required by external API
      stream: true,
      include_ads: true,
      user_id: opts.user,
      ...this.addParams
    };

    // const userApiKey = await this.getUserApiKeyFromToken(opts.authToken);
    const userApiKey = process.env.ECHO_STREAM_API_KEY;
    const headers = {
      ...this.headers,
      'Authorization': `Bearer ${userApiKey}`
    }

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
        headers: headers,
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
        
        buffer += chunkStr;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              debug(debugGroups.STREAMING, 'Received [DONE], ending stream');
              resolve(fullResponse || 'No response received');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              const type = parsed.choices?.[0]?.delta?.type;
              
              // DEBUG: Check for ads and tasks in the response
              debug(debugGroups.GENERAL, 'EchoStreamClient parsed SSE data:', {
                hasChoices: !!parsed.choices,
                content: content ? `"${content}"` : 'undefined',
                type: type,
                hasAds: !!parsed.ads,
                adsCount: parsed.ads ? parsed.ads.length : 0,
                hasTask: !!parsed.task,
                taskData: parsed.task ? JSON.stringify(parsed.task) : 'undefined',
                hasInsertionId: !!parsed.insertion_id,
                insertionId: parsed.insertion_id,
                allKeys: Object.keys(parsed)
              });
              
              // Handle content chunks
              if (content) {
                fullResponse += content;
                
                // Use SplitStreamHandler pattern like normal endpoints
                if (this.streamHandler) {
                  // Create a chunk in OpenAI format for SplitStreamHandler
                  const openAIChunk = {
                    choices: [{
                      delta: { content, type },
                      finish_reason: null
                    }]
                  };
                  this.streamHandler.handle(openAIChunk);
                } else if (onProgress) {
                  // Fallback: call onProgress directly (should not happen with proper setup)
                  onProgress(content);
                }
              }
              
              // Handle ads/tasks chunks
              if (parsed.ads || parsed.task) {
                debug(debugGroups.GENERAL, 'EchoStreamClient processing ads/task chunk IMMEDIATELY');
                
                // Format ad/task data as [AD]...[/AD] tags for frontend parsing
                const adData = {
                  ...(parsed.task && { task: parsed.task }),
                  ...(parsed.ads && { ads: parsed.ads }),
                  ...(parsed.ui_display && { ui_display: parsed.ui_display })
                };
                
                const adContent = `[AD]${JSON.stringify(adData)}[/AD]`;
                debug(debugGroups.GENERAL, 'EchoStreamClient formatted ad content:', adContent);
                
                fullResponse += adContent;
                
                // Send ad content through the stream handler
                if (this.streamHandler) {
                  const openAIChunk = {
                    choices: [{
                      delta: { content: adContent },
                      finish_reason: null
                    }]
                  };
                  this.streamHandler.handle(openAIChunk);
                } else if (onProgress) {
                  onProgress(adContent);
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

  getBuildMessagesOptions(opts) {
    return {
      isChatCompletion: true,
      promptPrefix: opts.promptPrefix,
      abortController: opts.abortController,
    };
  }

  checkVisionRequest(attachments) {
    // Echo stream doesn't support vision models - just return
    return;
  }

  getSaveOptions() {
    return {
      modelLabel: 'Echo Stream',
      endpoint: 'echo_stream'
    };
  }
}

module.exports = EchoStreamClient;