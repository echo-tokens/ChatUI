# Echo AI Streaming Service Implementation Guide

This guide explains how to build the streaming service that handles requests from LibreChat, routes them to LLM providers, and injects intelligent advertisements.

## 🏗️ **Service Architecture**

```
LibreChat → Your Streaming Service → LLM Provider (OpenAI/Anthropic/Google)
                     ↓
            Ad Detection & Injection
                     ↓
LibreChat ← Modified Stream ← Your Streaming Service
```

## 🚀 **Quick Start (Node.js/Express)**

### **1. Project Setup**

```bash
# Create new project
mkdir echo-streaming-service
cd echo-streaming-service
npm init -y

# Install dependencies
npm install express cors helmet morgan dotenv
npm install openai @anthropic-ai/sdk @google/generative-ai
npm install uuid

# Development dependencies
npm install -D nodemon
```

### **2. Basic Server Structure**

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/v1', require('./routes/chat'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      type: 'internal_error'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Echo Streaming Service running on port ${PORT}`);
});
```

### **3. Environment Variables**

```bash
# .env
PORT=8000

# API Keys for real providers
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_key_here

# Authentication (optional - LibreChat sends dummy key)
ECHO_API_KEY=dummy

# Ad injection settings
AD_INJECTION_RATE=0.3  # 30% of responses get ads
MIN_RESPONSE_LENGTH=200  # Minimum chars before considering ads
```

## 📡 **Core Implementation**

### **4. Model Router**

```javascript
// utils/modelRouter.js
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class ModelRouter {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    // Model mapping
    this.modelMap = {
      // OpenAI models
      'gpt-4o': { provider: 'openai', model: 'gpt-4o' },
      'o1': { provider: 'openai', model: 'o1' },
      'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
      
      // Anthropic models  
      'claude-3-5-sonnet-20241022': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      'claude-3-opus-20240229': { provider: 'anthropic', model: 'claude-3-opus-20240229' },
      
      // Google models
      'gemini-2.0-flash-exp': { provider: 'google', model: 'gemini-2.0-flash-exp' },
      'gemini-1.5-pro-latest': { provider: 'google', model: 'gemini-1.5-pro-latest' }
    };
  }

  getProvider(model) {
    const config = this.modelMap[model];
    if (!config) {
      throw new Error(`Unsupported model: ${model}`);
    }
    return config;
  }

  async streamCompletion(model, messages, options = {}) {
    const { provider, model: actualModel } = this.getProvider(model);
    
    switch (provider) {
      case 'openai':
        return this.streamOpenAI(actualModel, messages, options);
      case 'anthropic':
        return this.streamAnthropic(actualModel, messages, options);
      case 'google':
        return this.streamGoogle(actualModel, messages, options);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async streamOpenAI(model, messages, options) {
    return this.openai.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens
    });
  }

  async streamAnthropic(model, messages, options) {
    // Convert OpenAI format to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    return this.anthropic.messages.create({
      model,
      system: systemMessage,
      messages: chatMessages,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 4096
    });
  }

  async streamGoogle(model, messages, options) {
    const geminiModel = this.google.getGenerativeModel({ model });
    
    // Convert to Google format
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    return geminiModel.generateContentStream({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.max_tokens
      }
    });
  }
}

module.exports = ModelRouter;
```

### **5. Ad Injection Service**

```javascript
// utils/adInjection.js
class AdInjectionService {
  constructor() {
    this.adDatabase = [
      {
        content: "🚀 Upgrade to Echo AI Pro\nGet unlimited access to all models with priority processing.",
        link: "https://echo-ai.com/upgrade"
      },
      {
        content: "✨ New Feature: Code Analysis\nTry our advanced code review and optimization tools.",
        link: "https://echo-ai.com/features/code-analysis"
      },
      {
        content: "💡 Echo AI for Teams\nCollaborate with your team using shared AI workspaces.",
        link: "https://echo-ai.com/teams"
      },
      {
        content: "🔥 Limited Time: 50% Off Pro\nUpgrade now and save on your first year of Echo AI Pro.",
        link: "https://echo-ai.com/upgrade?promo=SAVE50"
      }
    ];
  }

  shouldInjectAd(responseLength, messageCount) {
    const injectionRate = parseFloat(process.env.AD_INJECTION_RATE) || 0.3;
    const minLength = parseInt(process.env.MIN_RESPONSE_LENGTH) || 200;
    
    // Don't inject ads in very short responses
    if (responseLength < minLength) return false;
    
    // Random injection based on rate
    return Math.random() < injectionRate;
  }

  getRandomAd() {
    return this.adDatabase[Math.floor(Math.random() * this.adDatabase.length)];
  }

  findAdInsertionPoint(text) {
    // Look for natural break points
    const sentences = text.split(/[.!?]+/);
    
    // Insert after first substantial paragraph (around 200 chars)
    let charCount = 0;
    for (let i = 0; i < sentences.length; i++) {
      charCount += sentences[i].length;
      if (charCount > 200 && i > 0) {
        // Return position after this sentence
        return text.indexOf(sentences[i]) + sentences[i].length + 1;
      }
    }
    
    // Fallback: middle of text
    return Math.floor(text.length / 2);
  }

  injectAd(text) {
    const ad = this.getRandomAd();
    const insertPoint = this.findAdInsertionPoint(text);
    
    const adBlock = `\n\n[ad]\n${ad.content}\n[/ad][link]${ad.link}[/link]\n\n`;
    
    return text.slice(0, insertPoint) + adBlock + text.slice(insertPoint);
  }
}

module.exports = AdInjectionService;
```

### **6. Main Chat Route**

```javascript
// routes/chat.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const ModelRouter = require('../utils/modelRouter');
const AdInjectionService = require('../utils/adInjection');

const router = express.Router();
const modelRouter = new ModelRouter();
const adService = new AdInjectionService();

router.post('/chat/completions', async (req, res) => {
  try {
    const { model, messages, stream = true, ...options } = req.body;
    
    if (!model || !messages) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: model and messages',
          type: 'invalid_request_error'
        }
      });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });

    const chatId = uuidv4();
    let fullResponse = '';
    let adInjected = false;

    try {
      const stream = await modelRouter.streamCompletion(model, messages, options);
      
      // Handle different provider stream formats
      if (model.startsWith('gpt') || model === 'o1') {
        // OpenAI stream
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullResponse += delta;
            
            // Check if we should inject an ad
            if (!adInjected && adService.shouldInjectAd(fullResponse.length, messages.length)) {
              // Inject ad at natural break point
              const modifiedResponse = adService.injectAd(fullResponse);
              const adPortion = modifiedResponse.slice(fullResponse.length);
              
              // Send the ad portion
              const adChunk = {
                id: chatId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [{
                  index: 0,
                  delta: { content: adPortion },
                  finish_reason: null
                }]
              };
              
              res.write(`data: ${JSON.stringify(adChunk)}\n\n`);
              fullResponse = modifiedResponse;
              adInjected = true;
            }
            
            // Send original content
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
          
          if (chunk.choices[0]?.finish_reason) {
            break;
          }
        }
      } else if (model.startsWith('claude')) {
        // Anthropic stream
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta') {
            const delta = chunk.delta.text || '';
            if (delta) {
              fullResponse += delta;
              
              // Convert to OpenAI format
              const openaiChunk = {
                id: chatId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [{
                  index: 0,
                  delta: { content: delta },
                  finish_reason: null
                }]
              };
              
              res.write(`data: ${JSON.stringify(openaiChunk)}\n\n`);
            }
          }
        }
      } else if (model.startsWith('gemini')) {
        // Google stream
        for await (const chunk of stream.stream) {
          const delta = chunk.text || '';
          if (delta) {
            fullResponse += delta;
            
            // Convert to OpenAI format
            const openaiChunk = {
              id: chatId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [{
                index: 0,
                delta: { content: delta },
                finish_reason: null
              }]
            };
            
            res.write(`data: ${JSON.stringify(openaiChunk)}\n\n`);
          }
        }
      }

      // Send final chunk
      const finalChunk = {
        id: chatId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      };
      
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (providerError) {
      console.error('Provider error:', providerError);
      
      const errorResponse = {
        error: {
          message: `Provider error: ${providerError.message}`,
          type: 'provider_error'
        }
      };
      
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Chat completion error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: error.message,
          type: 'internal_error'
        }
      });
    }
  }
});

// Optional: Models endpoint
router.get('/models', (req, res) => {
  const models = [
    'gpt-4o', 'o1', 'gpt-4o-mini',
    'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229',
    'gemini-2.0-flash-exp', 'gemini-1.5-pro-latest'
  ].map(id => ({
    id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'echo-ai'
  }));

  res.json({
    object: 'list',
    data: models
  });
});

module.exports = router;
```

## 🚀 **Railway Deployment**

### **7. Package.json Scripts**

```json
{
  "name": "echo-streaming-service",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "openai": "^4.20.1",
    "@anthropic-ai/sdk": "^0.9.1",
    "@google/generative-ai": "^0.2.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### **8. Railway Configuration**

Create these files for Railway:

**railway.toml**:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "always"
```

**Procfile** (optional):
```
web: npm start
```

## 🔧 **Testing Your Service**

### **9. Local Testing**

```bash
# Start your service
npm run dev

# Test health endpoint
curl http://localhost:8000/health

# Test models endpoint  
curl http://localhost:8000/v1/models

# Test chat (basic)
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### **10. Integration Testing**

Update your LibreChat `.env`:
```bash
ECHO_STREAM_BASE_URL=http://localhost:8000  # For local testing
# ECHO_STREAM_BASE_URL=https://your-service.railway.app  # For production
```

Then restart LibreChat backend and test the Echo models in the UI.

## 🚀 **Production Deployment Steps**

1. **Push to Railway**:
   ```bash
   # Connect to Railway
   railway login
   railway link
   
   # Set environment variables
   railway variables set OPENAI_API_KEY=your_key
   railway variables set ANTHROPIC_API_KEY=your_key  
   railway variables set GOOGLE_API_KEY=your_key
   
   # Deploy
   git add .
   git commit -m "Initial streaming service"
   git push
   railway deploy
   ```

2. **Update LibreChat**:
   ```bash
   # In your LibreChat project
   railway variables set ECHO_STREAM_BASE_URL=https://streaming-service.railway.internal
   railway deploy
   ```

3. **Test Integration**:
   - Check that Echo models appear in LibreChat UI
   - Send test messages and verify streaming works
   - Confirm ads appear in responses

## 🐛 **Debugging Tips**

- **Check Railway logs**: `railway logs`
- **Test endpoints directly**: Use curl or Postman
- **Verify environment variables**: `railway variables`
- **Monitor LibreChat backend logs**: Check for connection errors

This implementation gives you a complete streaming service that handles all the Echo AI models and injects ads seamlessly! 🎯 