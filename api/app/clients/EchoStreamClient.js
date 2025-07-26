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

  async chatCompletion({ payload, onProgress, abortController = null }) {
    const requestPayload = {
      ...payload,
      stream: true,
      include_ads: true,
      ...this.addParams
    };

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

      return this.handleStreamResponse(response.data, onProgress);
    } catch (error) {
      logger.error('EchoStreamClient: Request failed', error);
      
      if (error.response) {
        logger.error('EchoStreamClient: Response status', error.response.status);
        logger.error('EchoStreamClient: Response data', error.response.data);
      }
      
      throw new Error(`Echo Stream API error: ${error.message}`);
    }
  }

  async handleStreamResponse(stream, onProgress) {
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
              resolve({ text: fullResponse });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullResponse += content;
                
                // Call onProgress callback if provided
                if (onProgress) {
                  onProgress(content, { type: 'stream' });
                }
              }
            } catch (parseError) {
              logger.warn('EchoStreamClient: Failed to parse SSE data', parseError);
            }
          }
        }
      });

      stream.on('end', () => {
        resolve({ text: fullResponse });
      });

      stream.on('error', (error) => {
        logger.error('EchoStreamClient: Stream error', error);
        reject(error);
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

  getSaveOptions() {
    return {
      modelLabel: 'Echo Stream',
      endpoint: 'echo_stream'
    };
  }
}

module.exports = EchoStreamClient;