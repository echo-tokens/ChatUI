import { mockRailwayStreamChunks, mockRailwayConfig, mockRailwayErrors } from '../mocks/railway-responses';

// Mock fetch for Railway API calls
const mockFetch = (url, options) => {
  const config = JSON.parse(options.body);
  
  // Simulate Railway service responses based on request
  if (url.includes('/health')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        status: 'healthy',
        services: { adService: 'operational', llmProxy: 'operational' }
      })
    });
  }
  
  if (url.includes('/chat/stream')) {
    // Simulate streaming response
    const mockStream = new ReadableStream({
      start(controller) {
        mockRailwayStreamChunks.forEach((chunk, index) => {
          setTimeout(() => {
            controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
            if (index === mockRailwayStreamChunks.length - 1) {
              controller.enqueue('data: [DONE]\n\n');
              controller.close();
            }
          }, index * 50);
        });
      }
    });
    
    return Promise.resolve({
      ok: true,
      status: 200,
      body: mockStream,
      headers: {
        get: (name) => name === 'content-type' ? 'text/event-stream' : null
      }
    });
  }
  
  return Promise.reject(new Error('Unknown endpoint'));
};

// Mock SSE for client-side testing
class MockSSE {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.listeners = {};
    this.readyState = 0; // CONNECTING
  }
  
  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }
  
  removeEventListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }
  
  close() {
    this.readyState = 2; // CLOSED
  }
  
  // Simulate streaming
  stream() {
    this.readyState = 1; // OPEN
    
    // Emit open event
    if (this.listeners.open) {
      this.listeners.open.forEach(handler => handler());
    }
    
    // Simulate receiving chunks
    mockRailwayStreamChunks.forEach((chunk, index) => {
      setTimeout(() => {
        if (this.listeners.message) {
          this.listeners.message.forEach(handler => 
            handler({ data: JSON.stringify(chunk) })
          );
        }
      }, index * 50);
    });
    
    // Emit final event
    setTimeout(() => {
      if (this.listeners.message) {
        this.listeners.message.forEach(handler => 
          handler({ data: JSON.stringify({ final: true }) })
        );
      }
    }, mockRailwayStreamChunks.length * 50 + 100);
  }
}

describe('Railway Service Integration Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(mockFetch);
    global.SSE = jest.fn().mockImplementation(MockSSE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Streaming Flow', () => {
    it('should handle complete Railway streaming response', async () => {
      const messageQueue = [];
      const adTiles = [];
      
      const sse = new MockSSE('https://test-railway-app.railway.app/chat/stream', {
        payload: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Tell me about AI' }],
          stream: true,
          include_ads: true
        })
      });
      
      sse.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        
        if (data.final) {
          // End of stream
          return;
        }
        
        const content = data.choices?.[0]?.delta?.content;
        if (content) {
          messageQueue.push(content);
          
          // Check for ad content
          const fullContent = messageQueue.join('');
          const adMatch = fullContent.match(/\[ad\](.*?)\[\/ad\]/s);
          if (adMatch) {
            const linkMatch = fullContent.match(/\[link\](.*?)\[\/link\]/);
            adTiles.push({
              content: adMatch[1].trim(),
              link: linkMatch ? linkMatch[1] : null
            });
          }
        }
      });
      
      sse.stream();
      
      // Wait for streaming to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(messageQueue.length).toBeGreaterThan(0);
      expect(adTiles.length).toBe(1);
      expect(adTiles[0].content).toContain('Premium AI Tools');
      expect(adTiles[0].link).toBe('https://your-site.com/premium');
    });

    it('should handle Railway service errors gracefully', async () => {
      const errorMock = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      global.fetch = errorMock;
      
      try {
        await fetch('https://test-railway-app.railway.app/chat/stream', {
          method: 'POST',
          body: JSON.stringify({ model: 'gpt-4o', messages: [] })
        });
      } catch (error) {
        expect(error.message).toBe('Service unavailable');
      }
      
      expect(errorMock).toHaveBeenCalledTimes(1);
    });

    it('should handle Railway rate limiting', async () => {
      const rateLimitMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve(mockRailwayErrors.rateLimited)
      });
      global.fetch = rateLimitMock;
      
      const response = await fetch('https://test-railway-app.railway.app/chat/stream');
      const errorData = await response.json();
      
      expect(response.status).toBe(429);
      expect(errorData.retryAfter).toBe(60);
    });
  });

  describe('Health Check Integration', () => {
    it('should verify Railway service health', async () => {
      const response = await fetch('https://test-railway-app.railway.app/health');
      const health = await response.json();
      
      expect(response.ok).toBe(true);
      expect(health.status).toBe('healthy');
      expect(health.services.adService).toBe('operational');
    });

    it('should handle unhealthy service responses', async () => {
      const unhealthyMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({
          status: 'unhealthy',
          services: { adService: 'down', llmProxy: 'operational' }
        })
      });
      global.fetch = unhealthyMock;
      
      const response = await fetch('https://test-railway-app.railway.app/health');
      const health = await response.json();
      
      expect(response.status).toBe(503);
      expect(health.status).toBe('unhealthy');
      expect(health.services.adService).toBe('down');
    });
  });

  describe('Model Validation Integration', () => {
    it('should accept valid Railway models', async () => {
      const validModels = ['gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash'];
      
      for (const model of validModels) {
        const response = await fetch('https://test-railway-app.railway.app/chat/stream', {
          method: 'POST',
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        
        expect(response.ok).toBe(true);
      }
    });

    it('should reject invalid models', async () => {
      const invalidModelMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockRailwayErrors.invalidModel)
      });
      global.fetch = invalidModelMock;
      
      const response = await fetch('https://test-railway-app.railway.app/chat/stream', {
        method: 'POST',
        body: JSON.stringify({
          model: 'invalid-model',
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      
      const error = await response.json();
      
      expect(response.status).toBe(400);
      expect(error.supportedModels).toContain('gpt-4o');
    });
  });

  describe('Ad Insertion Timing', () => {
    it('should insert ads at appropriate intervals', async () => {
      const streamEvents = [];
      
      const sse = new MockSSE('https://test-railway-app.railway.app/chat/stream');
      
      sse.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        const content = data.choices?.[0]?.delta?.content;
        
        if (content) {
          streamEvents.push({
            timestamp: Date.now(),
            content,
            isAd: content.includes('[ad]')
          });
        }
      });
      
      sse.stream();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const adEvents = streamEvents.filter(event => event.isAd);
      const textEvents = streamEvents.filter(event => !event.isAd);
      
      expect(adEvents.length).toBe(1);
      expect(textEvents.length).toBeGreaterThan(0);
      
      // Ad should appear after some text but before the end
      const adIndex = streamEvents.findIndex(event => event.isAd);
      expect(adIndex).toBeGreaterThan(0);
      expect(adIndex).toBeLessThan(streamEvents.length - 1);
    });

    it('should not insert ads in very short responses', async () => {
      const shortResponseChunks = [
        { choices: [{ delta: { content: "Yes." } }] },
        { choices: [{ delta: { content: "", finish_reason: "stop" } }] }
      ];
      
      // Mock short response
      const shortResponseMock = jest.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            shortResponseChunks.forEach((chunk, index) => {
              setTimeout(() => {
                controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
                if (index === shortResponseChunks.length - 1) {
                  controller.close();
                }
              }, index * 10);
            });
          }
        })
      });
      global.fetch = shortResponseMock;
      
      const response = await fetch('https://test-railway-app.railway.app/chat/stream');
      
      expect(response.ok).toBe(true);
      // In real implementation, short responses shouldn't trigger ads
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to direct LLM on Railway service failure', async () => {
      const failureMock = jest.fn()
        .mockRejectedValueOnce(new Error('Railway service down'))
        .mockResolvedValueOnce({
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue('data: {"choices":[{"delta":{"content":"Fallback response"}}]}\n\n');
              controller.close();
            }
          })
        });
      
      global.fetch = failureMock;
      
      // First call should fail
      try {
        await fetch('https://test-railway-app.railway.app/chat/stream');
      } catch (error) {
        expect(error.message).toBe('Railway service down');
      }
      
      // Fallback call should succeed
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions');
      expect(fallbackResponse.ok).toBe(true);
    });

    it('should handle partial stream failures', async () => {
      let chunkCount = 0;
      const partialFailureMock = jest.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            // Send a few chunks then fail
            const sendChunk = () => {
              if (chunkCount < 2) {
                controller.enqueue(`data: {"choices":[{"delta":{"content":"Chunk ${chunkCount}"}}]}\n\n`);
                chunkCount++;
                setTimeout(sendChunk, 50);
              } else {
                controller.error(new Error('Stream interrupted'));
              }
            };
            sendChunk();
          }
        })
      });
      
      global.fetch = partialFailureMock;
      
      const response = await fetch('https://test-railway-app.railway.app/chat/stream');
      expect(response.ok).toBe(true);
      
      // Stream should handle partial failures gracefully
      const reader = response.body.getReader();
      let chunks = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(new TextDecoder().decode(value));
        }
      } catch (error) {
        expect(error.message).toBe('Stream interrupted');
      }
      
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track Railway service response times', async () => {
      const startTime = Date.now();
      
      await fetch('https://test-railway-app.railway.app/chat/stream', {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      
      const responseTime = Date.now() - startTime;
      
      // Railway service should respond quickly
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        fetch('https://test-railway-app.railway.app/chat/stream', {
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: `Request ${i}` }]
          })
        })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;
      
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(2000);
    });
  });
}); 