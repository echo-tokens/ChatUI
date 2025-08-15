# Railway Streaming Integration Guide

## Overview
This system integrates a Railway-hosted streaming service that adds contextual advertisements to AI model responses while maintaining full LibreChat compatibility.

## Architecture

### System Flow
```
User → LibreChat UI → Model Selection → Railway Streaming Service → LLM Provider → Response with Ads → LibreChat
```

### Components
1. **LibreChat** - Main chat interface
2. **Railway Streaming Service** - Proxy service that adds ads
3. **LLM Providers** - OpenAI, Anthropic, Google, xAI

## Configuration Methods

### Method 1: Aliased Models (Recommended)
Echo models appear within existing provider categories.

**Benefits:**
- Models appear in their respective provider sections (OpenAI, Anthropic, etc.)
- Familiar organization for users
- Less UI clutter

**Configuration:**
```yaml
# librechat.yaml
endpoints:
  openAI:
    models:
      default: ["gpt-4o", "o1", "gpt-4o-mini", "echo-gpt-4o"]
  
modelSpecs:
  list:
    - name: "echo-gpt-4o"
      label: "Echo GPT-4o"
      preset:
        endpoint: "echo_stream"  # Redirects to Railway service
        model: "gpt-4o"
```

### Method 2: Separate Custom Endpoint
Echo models appear as separate "Echo Stream" category.

**Benefits:**
- Clear separation of ad-enabled models
- Easy to enable/disable entire category

**Configuration:**
```yaml
# librechat.yaml
endpoints:
  custom:
    - name: "echo_stream"
      baseURL: "https://streaming-service.railway.internal"
      models: ["gpt-4o", "claude-3-5-sonnet", ...]

modelSpecs:
  list:
    - name: "echo_stream_gpt4o"
      label: "Echo GPT-4o"
      preset:
        endpoint: "echo_stream"
        model: "gpt-4o"
```

## Technical Implementation

### Backend Model Restrictions
```javascript
// api/server/controllers/ModelController.js
const ALLOWED_MODELS = {
  openAI: ['gpt-4o', 'o1', 'gpt-4o-mini', 'echo-gpt-4o'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'echo-claude'],
  google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro-latest', 'echo-gemini'],
  xai: ['grok-3-mini', 'grok-3', 'echo-grok'],
  echo_stream: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash', 'grok-3']
};
```

### Frontend Display Names
```javascript
// client/src/components/Chat/Menus/Endpoints/components/EndpointModelItem.tsx
const MODEL_DISPLAY_NAMES = {
  'echo-gpt-4o': 'Echo GPT-4o',
  'echo-claude': 'Echo Claude',
  'echo-gemini': 'Echo Gemini',
  'echo-grok': 'Echo Grok',
  // ... other models
};
```

## Railway Service Integration

### Environment Variables
Set in **LibreChat Railway service**:
```bash
ECHO_STREAM_BASE_URL=https://streaming-service.railway.internal
ECHO_STREAM_API_KEY=dummy
```

### Request Flow
1. User selects "Echo GPT-4o" from OpenAI section
2. LibreChat sees `preset.endpoint: "echo_stream"` in modelSpec
3. Request goes to Railway streaming service instead of OpenAI
4. Railway service calls actual OpenAI API
5. Railway service inserts ads using `[ad]...[/ad][link]...[/link]` tags
6. Response streams back to LibreChat with ads

### Ad Format
```
Regular AI response text...

[ad]Premium AI Tools

Unlock advanced AI capabilities with our premium subscription[/ad][link]https://your-site.com/premium[/link]

...continuing AI response
```

## Railway Service API

### Health Check
```bash
GET /health
# Returns service status and available providers
```

### Available Models
```bash
GET /api/chat/models
# Returns list of supported models per provider
```

### Test Ad Generation
```bash
POST /api/chat/test-ad
{
  "context": "programming and AI development"
}
# Returns sample ad with formatting
```

### Main Streaming Endpoint
```bash
POST /api/chat/stream
{
  "model": "gpt-4o",
  "messages": [...],
  "temperature": 0.7,
  "stream": true
}
# Returns SSE stream with ad insertions
```

## Ad Tile Component

### Frontend Implementation
```typescript
// client/src/components/Chat/Messages/Content/Parts/AdTile.tsx
interface AdTileProps {
  content: string;
  showCursor: boolean;
  link?: string;
}

const AdTile = ({ content, showCursor, link }: AdTileProps) => {
  // Parses ad content and renders clickable tile
  // Handles Railway service format with title/description
  // Animates height from 0 to auto (150ms ease-out)
};
```

### Content Parsing
```typescript
// client/src/hooks/SSE/useContentHandler.ts
if (type === ContentTypes.AD_TILE) {
  const adContent = data[ContentTypes.AD_TILE] as string;
  
  // Parse Railway format
  const linkMatch = adContent.match(/\[link\](.*?)\[\/link\]/);
  const cleanContent = adContent.replace(/\[link\].*?\[\/link\]/g, '').trim();
  const link = linkMatch ? linkMatch[1] : undefined;
  
  const part: ContentPart = {
    value: cleanContent,
    link: link,
    type: ContentTypes.AD_TILE
  };
}
```

## Deployment

### Railway Services Setup
1. **LibreChat Service** (`librechat-dev`)
   - Runs main LibreChat application
   - Accessible via `chat.echollm.io`
   - Contains environment variables for Railway service URL

2. **Streaming Service** (`streaming-service`)
   - Runs ad-insertion proxy
   - Accessible via private networking: `streaming-service.railway.internal`
   - Contains LLM provider API keys

### Domain Configuration
- **Public**: `chat.echollm.io` → LibreChat service
- **Internal**: `streaming-service.railway.internal` → API calls from LibreChat

## Testing

### Model Availability
Check if Echo models appear in UI:
1. OpenAI section should show "Echo GPT-4o"
2. Anthropic section should show "Echo Claude"
3. Google section should show "Echo Gemini"
4. xAI section should show "Echo Grok"

### Ad Insertion Testing
1. Select an Echo model
2. Send a message longer than 150 tokens
3. Look for ad tiles appearing mid-response
4. Verify ads are clickable and open correct URLs
5. Check that ads don't break streaming

### Railway Service Health
```bash
curl https://streaming-service.railway.internal/health
# Should return 200 with service status
```

## Troubleshooting

### Models Not Appearing
1. Check `librechat.yaml` syntax
2. Verify backend model restrictions include echo models
3. Check frontend display name mappings
4. Restart LibreChat service after config changes

### Ads Not Appearing
1. Verify Railway service is running
2. Check environment variables in LibreChat service
3. Test Railway service health endpoint
4. Check browser network tab for failed requests

### Streaming Issues
1. Verify Railway service streaming endpoint works
2. Check CORS configuration
3. Verify SSE event parsing in frontend
4. Check Railway service logs for errors

## Benefits of This Approach

1. **Seamless Integration** - Echo models appear naturally within existing categories
2. **User Choice** - Users can choose ad-enabled or regular models
3. **Fallback Support** - If Railway service fails, regular models still work
4. **Scalable** - Easy to add more echo models or providers
5. **Maintainable** - Clear separation between LibreChat and ad service logic

## Future Enhancements

1. **A/B Testing** - Different ad frequencies or placements
2. **Targeting** - Context-aware ad selection
3. **Analytics** - Track ad performance and user engagement
4. **Revenue Sharing** - Integration with ad networks
5. **Custom Branding** - Per-user or per-organization ad customization 