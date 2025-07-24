require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.open for AdTile click testing
global.window.open = jest.fn();

// Mock fetch for Railway service API calls
global.fetch = jest.fn();

// Mock SSE for streaming tests
global.EventSource = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2
}));

// Mock Railway service environment variables
process.env.ECHO_STREAM_API_KEY = 'test-api-key';
process.env.ECHO_STREAM_BASE_URL = 'https://test-railway-app.railway.app';

// Console suppression for cleaner test output
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes && args[0].includes('Warning: ReactDOM.render')) {
    return;
  }
  originalError.call(console, ...args);
};

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
}); 