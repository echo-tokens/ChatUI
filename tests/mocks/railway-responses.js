// Mock Railway service streaming responses
const mockRailwayStreamChunks = [
  // Regular text chunk
  {
    choices: [{
      delta: { content: "Hello! I can help you with " }
    }]
  },
  
  // More text before ad
  {
    choices: [{
      delta: { content: "that. Let me provide some information about " }
    }]
  },
  
  // Ad insertion chunk from Railway service
  {
    choices: [{
      delta: { 
        content: "\n\n[ad]Premium AI Tools\n\nUnlock advanced AI capabilities with our premium subscription[/ad][link]https://your-site.com/premium[/link]\n\n" 
      }
    }]
  },
  
  // Continue regular response
  {
    choices: [{
      delta: { content: "the topic you mentioned. Here are some key points:" }
    }]
  },
  
  // Final chunk
  {
    choices: [{
      delta: { content: "\n\n1. First point\n2. Second point" },
      finish_reason: "stop"
    }]
  }
];

// Mock Railway service configuration response
const mockRailwayConfig = {
  endpoint: "echo_stream",
  baseURL: "https://test-railway-app.railway.app",
  models: ["gpt-4o", "claude-3-5-sonnet", "gemini-2.0-flash"],
  apiKey: "test-api-key",
  features: {
    adInsertion: true,
    streamRate: 1,
    adFrequency: "moderate"
  }
};

// Mock ad content variations
const mockAdContent = [
  {
    content: "Premium AI Tools\n\nUnlock advanced AI capabilities with our premium subscription",
    link: "https://your-site.com/premium",
    metadata: {
      category: "tech",
      targeting: ["ai", "programming"],
      campaignId: "camp_001"
    }
  },
  {
    content: "Online Courses\n\nLearn new skills with expert-led online courses",
    link: "https://your-site.com/courses", 
    metadata: {
      category: "education",
      targeting: ["learning", "skills"],
      campaignId: "camp_002"
    }
  }
];

// Mock Railway API error responses
const mockRailwayErrors = {
  serviceUnavailable: {
    error: "Service temporarily unavailable",
    code: 503,
    fallback: "direct_llm"
  },
  
  rateLimited: {
    error: "Rate limit exceeded",
    code: 429,
    retryAfter: 60
  },
  
  invalidModel: {
    error: "Model not supported",
    code: 400,
    supportedModels: ["gpt-4o", "claude-3-5-sonnet"]
  }
};

// Mock Railway service health check
const mockHealthCheck = {
  status: "healthy",
  version: "1.0.0",
  services: {
    adService: "operational",
    llmProxy: "operational",
    smallLLM: "operational"
  },
  latency: {
    avg: 45,
    p95: 120
  }
};

module.exports = {
  mockRailwayStreamChunks,
  mockRailwayConfig,
  mockAdContent,
  mockRailwayErrors,
  mockHealthCheck
}; 