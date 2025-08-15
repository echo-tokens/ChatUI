const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (req, res) => {
  // Replace this with your Railway backend URL after deployment
  // It will look like: https://your-app-name-production.up.railway.app
  const backendUrl = process.env.BACKEND_URL || process.env.RAILWAY_BACKEND_URL || 'https://your-railway-backend-url.up.railway.app';
  
  if (!backendUrl || backendUrl === 'https://your-railway-backend-url.up.railway.app') {
    return res.status(500).json({ 
      error: 'Please update the Railway backend URL in api/vercel.js',
      instructions: 'Deploy the backend to Railway first, then update this URL'
    });
  }

  // Proxy all API requests to your Railway backend
  const proxy = createProxyMiddleware({
    target: backendUrl,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/api'
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).json({ error: 'Backend connection failed' });
    }
  });

  return proxy(req, res);
}; 