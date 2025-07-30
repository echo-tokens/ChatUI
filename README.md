# Echo AI Chat Interface

A customized LibreChat instance with integrated streaming service for intelligent ad placement.

## 🚀 Quick Start - Local Development

### Prerequisites
- Node.js 20+ 
- MongoDB (local or cloud)
- Git

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd ChatUI
npm install
```

### 2. Build Workspace Packages
```bash
npm run build:data-provider
npm run build:api
npm run build:data-schemas
cd client
npm run build
cd ..
```

### 3. Environment Setup
Create `.env` file in root:
```bash
# Core Database
MONGO_URI=mongodb://localhost:27017/librechat

# API Keys (get from respective providers)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key  
GOOGLE_API_KEY=your_google_key

# Echo Streaming Service (Railway)
ECHO_STREAM_BASE_URL=https://streaming-service.railway.internal
ECHO_STREAM_API_KEY=dummy

# Security
JWT_SECRET=your_jwt_secret_here
CREDS_KEY=your_creds_encryption_key
CREDS_IV=your_creds_iv

# Optional: Development
NODE_ENV=development
```

### 4. Start Development Servers

**Option A: Separate Terminals (Recommended)**
```bash
# Terminal 1: Backend
npm run backend:dev

# Terminal 2: Frontend  
npm run frontend:dev
```

**Option B: Background Processes**
```bash
# Start both in background
npm run backend:dev > backend.log 2>&1 &
npm run frontend:dev > frontend.log 2>&1 &

# View logs
tail -f backend.log
tail -f frontend.log

# Stop processes
pkill -f "node api/server/index.js"
pkill -f "vite"
```

**Option C: Docker**
This option does not dynamically update; image must be rebuilt for every change. This simulates how Railway deploys the code. If Railway deployment fails, then this option might be the best option for debugging.
```bash
 # stop containers running image, if existing
docker rm $(docker stop $(docker ps -a -q --filter ancestor=echo-ai-chat))
 # delete image, if existing
docker rmi echo-ai-chat
# build image
docker build -t echo-ai-chat .
# run image
docker run -d \
  --name echo-ai-chat -p 3080:3080 -v $(pwd)/.env:/app/.env \
  -v $(pwd)/librechat.yaml:/app/librechat.yaml echo-ai-chat
  ```

This is a useful command to add to your `.bashrc` that does all this and immediately opens the Docker logs (anything that gets printed with `console.log`, which is NOT printed to the normal browser console output):
```bash
function run_echo_ai_chat() {
  # Stop and remove any existing containers using the same image
  docker rm $(docker stop $(docker ps -a -q --filter ancestor=echo-ai-chat)) 2>/dev/null

  # Remove existing image
  docker rmi echo-ai-chat 2>/dev/null

  # Build the Docker image
  docker build -t echo-ai-chat .

  # Run the container
  container_id=$(docker run -d \
    --name echo-ai-chat \
    -p 3080:3080 \
    -v "$(pwd)/.env:/app/.env" \
    -v "$(pwd)/librechat.yaml:/app/librechat.yaml" \
    echo-ai-chat)

  echo "Container started: $container_id"
  echo "Tailing logs..."
  docker logs -f "$container_id"
}

```


### 5. Access Application
- **Frontend**: http://localhost:3091 (or check console for port)
- **Backend**: http://localhost:3080
- **Backend API**: http://localhost:3080/api/config

## 🛠 Development Workflow

### Common Commands
```bash
# Build packages after changes
npm run build:data-provider
npm run build:api

# Restart services
npm run backend:dev    # Backend only
npm run frontend:dev   # Frontend only

# Production build
npm run frontend       # Full frontend build

# Testing
npm run test:client    # Frontend tests
npm run test:api       # Backend tests

# Linting & Formatting
npm run lint          # Check code
npm run lint:fix      # Fix issues
npm run format        # Format code
```

### File Structure
```
ChatUI/
├── api/                 # Backend (Express.js)
├── client/             # Frontend (React/Vite)
├── packages/           # Shared packages
│   ├── data-provider/  # API client
│   └── api/           # Backend utilities
├── librechat.yaml     # Main configuration
└── README.md          # This file
```

## 🤖 Echo AI Configuration

This instance includes a custom Echo AI streaming service for intelligent ad integration. For detailed information about how the model configuration works, debugging, and streaming service integration, see:

**📖 [Echo AI Configuration Guide](docs/ECHO_AI_CONFIGURATION.md)**

Key features:
- Custom model endpoints routing through streaming service
- Intelligent ad tile integration mid-stream
- Dual frontend/backend model restrictions
- Railway deployment with internal service communication

### Development Tips

**Fast Iteration:**
- Backend changes: Auto-restart with nodemon
- Frontend changes: Hot reload with Vite
- Config changes: Restart backend only

**Debugging:**
- Frontend: Browser DevTools console
- Backend: Check `backend.log` or terminal output
- Network: Browser Network tab for API calls

**Common Issues:**
- Port conflicts: Frontend will auto-find available port
- Package errors: Run `npm run build:data-provider && npm run build:api`
- Config errors: Check backend logs for validation issues

## 🌐 Railway Deployment

### Environment Variables (Railway)
Add to your LibreChat Railway service:
```bash
ECHO_STREAM_BASE_URL=https://streaming-service.railway.internal
ECHO_STREAM_API_KEY=dummy
```

### Deploy Changes
```bash
git add -A
git commit -m "Your changes"
git push origin main
```

Railway will auto-deploy from your connected GitHub repository.

## 📁 Key Configuration Files

- `librechat.yaml` - Main app configuration
- `client/src/components/Chat/Header.tsx` - UI modifications
- `api/server/controllers/ModelController.js` - Model restrictions
- `.env` - Environment variables (local only)

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check for validation errors
tail -20 backend.log

# Common fixes
npm run build:data-provider
npm run build:api
```

### Frontend Build Errors
```bash
# Clear and rebuild
rm -rf client/dist client/node_modules/.vite
npm run build:data-provider
cd client && npm run dev
```

### Models Not Appearing
1. Check `librechat.yaml` validation
2. Verify API keys in `.env`
3. Check browser console for errors
4. Test backend: `curl http://localhost:3080/api/config`

---

**Need Help?** Check the logs first, then refer to [LibreChat Documentation](https://docs.librechat.ai).
# Force Railway rebuild
# Disable social login completely
