# Echo AI Configuration Guide

This document explains how the Echo AI models are configured in this LibreChat instance, how the streaming service integration works, and how to develop/debug the system locally.

## 📖 Overview

Echo AI is a custom streaming service that intercepts chat requests, adds intelligent advertisements, and streams responses back to LibreChat. The system is designed to be transparent to users while monetizing through contextual ads.

### Architecture
```
User Input → LibreChat → Echo Streaming Service → LLM Provider → Echo Service → LibreChat → User
                                ↓
                        Ad Detection & Insertion
```

## 🔧 Configuration Structure

### librechat.yaml Configuration

The Echo AI models are configured through a custom endpoint in `librechat.yaml`:

```yaml
endpoints:
  custom:
    - name: "echo_stream"
      baseURL: "${ECHO_STREAM_BASE_URL:-https://streaming-service.railway.internal}"
      apiKey: "${ECHO_STREAM_API_KEY}"
      models:
        default: [
          # OpenAI Models
          "gpt-4o", "o1", "gpt-4o-mini",
          # Anthropic Models  
          "claude-3-5-sonnet-20241022", "claude-3-opus-20240229",
          # Google Models
          "gemini-2.0-flash-exp", "gemini-1.5-pro-latest"
        ]
        fetch: false
      titleConvo: true
      titleModel: "gpt-4o-mini"
      modelDisplayLabel: "Echo AI"
      streamRate: 1
```

**Key Configuration Options:**
- `name`: Endpoint identifier (`echo_stream`)
- `baseURL`: URL of your streaming service (uses Railway internal DNS in production)
- `apiKey`: Authentication key for your streaming service
- `models.default`: List of models your streaming service supports
- `fetch: false`: Don't fetch models from the endpoint (use hardcoded list)
- `streamRate: 1`: Streaming speed (1 = normal, higher = faster)

### Model Controller Backend Restrictions

Models are also restricted at the backend level in `api/server/controllers/ModelController.js`:

```javascript
const ALLOWED_MODELS = {
  openAI: ['gpt-4o', 'o1', 'gpt-4o-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'], 
  google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro-latest'],
  echo_stream: [
    'gpt-4o', 'o1', 'gpt-4o-mini',
    'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229',
    'gemini-2.0-flash-exp', 'gemini-1.5-pro-latest'
  ]
};
```

This dual configuration ensures:
1. **Frontend** sees only approved models via `librechat.yaml`
2. **Backend** enforces the same restrictions server-side
3. **Consistency** between what's displayed and what's allowed

## 🌐 Streaming Service Integration

### How It Works

1. **User Interaction**: User selects an Echo AI model and sends a message
2. **LibreChat Processing**: LibreChat prepares the request as normal
3. **Echo Service Call**: Instead of calling OpenAI/Anthropic/Google directly, LibreChat calls your streaming service
4. **Model Routing**: Your streaming service determines which provider to call based on the model name
5. **LLM Response**: The actual LLM provider returns a response
6. **Ad Injection**: Your streaming service detects appropriate moments and injects `[ad]...[/ad]` tags
7. **Stream Back**: The modified response streams back to LibreChat
8. **UI Rendering**: LibreChat renders the response with ads as special tiles

### Ad Tile Format

The streaming service should inject ads using this format:
```
Regular response text here.

[ad]
Check out our premium features!
Upgrade to Pro for unlimited access.
[/ad][link]https://example.com/upgrade[/link]

More response text continues...
```

**Ad Rendering Features:**
- Ads appear in purple-themed tiles within the chat
- Tiles animate their height from 0 to auto (150ms ease-out)
- Clicking the tile opens the link URL
- Ad text streams naturally without artificial delays
- Background is subtly transparent with gentle hover effects

### Error Handling

If your streaming service is unavailable, LibreChat will:
1. Show an error message in chat
2. Not break the overall application
3. Allow users to try other models

## 🏗️ Local Development Setup

### Quick Start

Follow the main [README.md](../README.md) for basic setup, then:

1. **Start Development Servers**:
```bash
# Terminal 1: Backend
npm run backend:dev

# Terminal 2: Frontend  
npm run frontend:dev
```

2. **Access Application**:
   - Frontend: http://localhost:3091
   - Backend API: http://localhost:3080

### Environment Variables

Add these to your `.env` file:
```bash
# Echo Streaming Service
ECHO_STREAM_BASE_URL=http://localhost:8000  # Local development
ECHO_STREAM_API_KEY=dummy                   # Your API key

# Or for Railway production:
# ECHO_STREAM_BASE_URL=https://streaming-service.railway.internal
```

### Testing Configuration Changes

1. **Edit Configuration**: Modify `librechat.yaml`
2. **Restart Backend**: 
   ```bash
   pkill -f "node api/server/index.js"
   npm run backend:dev
   ```
3. **Test Models**: Check http://localhost:3080/api/models
4. **Verify Frontend**: Models should appear in UI after refresh

### Common Development Tasks

**View Available Models**:
```bash
curl -s http://localhost:3080/api/models | jq '.echo_stream'
```

**Check Configuration**:
```bash
curl -s http://localhost:3080/api/config | jq '.endpoints'
```

**Restart Services**:
```bash
# Background processes
pkill -f "node api/server/index.js" && npm run backend:dev > backend.log 2>&1 &
pkill -f "vite" && npm run frontend:dev > frontend.log 2>&1 &
```

**View Logs**:
```bash
tail -f backend.log
tail -f frontend.log
```

## 🧪 Testing & Debugging

### Model Display Testing

Create a simple test script to verify model configuration:

```javascript
// test-models.js
const config = require('./librechat.yaml');
const { ALLOWED_MODELS } = require('./api/server/controllers/ModelController.js');

console.log('echo_stream models:', config.endpoints.custom[0].models.default);
console.log('Backend allowed:', ALLOWED_MODELS.echo_stream);
```

### UI Testing

1. **Check Model Selector**: Echo AI models should appear in dropdown
2. **Test Streaming**: Send a message and verify streaming works
3. **Ad Tiles**: If your streaming service includes `[ad]` tags, verify they render correctly

### Debugging Steps

1. **Models Not Appearing**:
   - Check backend logs for configuration errors
   - Verify `librechat.yaml` syntax
   - Test `/api/models` endpoint

2. **Streaming Issues**:
   - Check `ECHO_STREAM_BASE_URL` in `.env`
   - Verify streaming service is running
   - Test streaming service directly

3. **Configuration Changes Not Taking Effect**:
   - Restart backend server
   - Check git status (changes need to be committed in some cases)
   - Verify no config file caching

## 📁 File Structure

Key files for Echo AI configuration:

```
ChatUI/
├── librechat.yaml                              # Main configuration
├── api/server/controllers/ModelController.js   # Backend model restrictions  
├── client/src/components/Chat/Messages/        # Ad tile rendering
├── docs/ECHO_AI_CONFIGURATION.md              # This documentation
└── README.md                                   # Main development guide
```

## 🚀 Deployment

### Railway Deployment

1. **Set Environment Variables** in Railway dashboard:
   ```
   ECHO_STREAM_BASE_URL=https://streaming-service.railway.internal
   ECHO_STREAM_API_KEY=your_production_key
   ```

2. **Deploy LibreChat**: Railway will automatically deploy on git push

3. **Deploy Streaming Service**: Deploy your streaming service to Railway in the same project

4. **Test Integration**: Verify models appear and streaming works

### Docker Deployment

For Docker deployments, ensure environment variables are set in your `docker-compose.yml`:

```yaml
services:
  librechat:
    environment:
      - ECHO_STREAM_BASE_URL=http://streaming-service:8000
      - ECHO_STREAM_API_KEY=your_key
    depends_on:
      - streaming-service
      
  streaming-service:
    # Your streaming service configuration
```

## 🔍 Troubleshooting

### Common Issues

**Models don't appear in UI**:
- Check backend logs: `tail -f backend.log`
- Verify configuration: `curl http://localhost:3080/api/models`
- Restart backend and check again

**Streaming service connection fails**:
- Verify `ECHO_STREAM_BASE_URL` is correct
- Check if streaming service is running
- Test direct API call to streaming service

**Ad tiles not rendering**:
- Ensure your streaming service outputs `[ad]...[/ad]` tags
- Check browser console for rendering errors
- Verify ad tile components are properly imported

**Configuration changes ignored**:
- Restart backend after config changes
- Check if configuration file has syntax errors
- Verify environment variables are loaded

### Getting Help

1. Check backend logs for specific error messages
2. Test individual components (config endpoint, models endpoint, streaming)
3. Verify environment variables are set correctly
4. Ensure all dependencies are installed and built

---

## 📚 Related Documentation

- [Main README](../README.md) - Local development setup
- [LibreChat Documentation](https://docs.librechat.ai/) - Official LibreChat docs
- [Railway Documentation](https://docs.railway.app/) - Deployment platform docs

## 🤝 Contributing

When making changes to Echo AI configuration:

1. Update both `librechat.yaml` and `ModelController.js`
2. Test locally before deploying
3. Update this documentation if adding new features
4. Commit all changes together for consistency 