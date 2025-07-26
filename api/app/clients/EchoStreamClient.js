const axios = require('axios');
const BaseClient = require('./BaseClient');
const { logger } = require('~/config');

class EchoStreamClient extends BaseClient {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    
    const baseURL = options.reverseProxyUrl || 'https://streaming-service.railway.internal';
    // Add your specific endpoint path here
    this.baseURL = `${baseURL}/api/chat/stream`;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Service-Type': 'echo-proxy',
      'User-Agent': 'LibreChat/1.0',
      ...options.headers
    };
    
    this.addParams = options.addParams || {};
    this.sender = options.sender || 'Echo AI';
  }

  async sendMessage(text, parentMessageId = null, conversationId = null) {
    const messages = await this.buildMessages(text, parentMessageId, conversationId);
    
    const payload = {
      messages,
      stream: true,
      include_ads: true,
      ...this.addParams,
      ...this.modelOptions
    };

    logger.info('EchoStreamClient: Sending request to', this.baseURL);
    logger.debug('EchoStreamClient: Request payload', payload);

    try {
      const response = await axios({
        method: 'POST',
        url: this.baseURL,
        headers: this.headers,
        data: payload,
        timeout: 120000,
        responseType: 'stream'
      });

      return this.handleStreamResponse(response.data);
    } catch (error) {
      logger.error('EchoStreamClient: Request failed', error);
      
      if (error.response) {
        logger.error('EchoStreamClient: Response status', error.response.status);
        logger.error('EchoStreamClient: Response data', error.response.data);
      }
      
      throw new Error(`Echo Stream API error: ${error.message}`);
    }
  }

  async handleStreamResponse(stream) {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let buffer = '';

      stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              resolve(fullResponse);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullResponse += content;
                
                // Emit streaming data if callback exists
                if (this.onProgress) {
                  this.onProgress(content);
                }
              }
            } catch (parseError) {
              logger.warn('EchoStreamClient: Failed to parse SSE data', parseError);
            }
          }
        }
      });

      stream.on('end', () => {
        resolve(fullResponse);
      });

      stream.on('error', (error) => {
        logger.error('EchoStreamClient: Stream error', error);
        reject(error);
      });
    });
  }

  async buildMessages(text, parentMessageId, conversationId) {
    const messages = [];
    
    // Get conversation history if available
    if (conversationId && parentMessageId) {
      try {
        const conversation = await this.getConvo(conversationId);
        const previousMessages = await this.getMessages({ conversationId });
        
        // Convert to OpenAI format
        for (const msg of previousMessages) {
          if (msg.text) {
            messages.push({
              role: msg.isCreatedByUser ? 'user' : 'assistant',
              content: msg.text
            });
          }
        }
      } catch (error) {
        logger.warn('EchoStreamClient: Failed to load conversation history', error);
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: text
    });

    return messages;
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

  getSaveOptions() {
    return {
      modelLabel: 'Echo Stream',
      endpoint: 'echo_stream'
    };
  }
}

module.exports = EchoStreamClient;