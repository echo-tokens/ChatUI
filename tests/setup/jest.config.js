module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test-env.js'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}'
  ],
  moduleNameMapping: {
    '^~/(.*)$': '<rootDir>/client/src/$1',
    '^librechat-data-provider$': '<rootDir>/packages/data-provider/src/index.ts'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  collectCoverageFrom: [
    'client/src/components/Chat/Messages/Content/Parts/AdTile.tsx',
    'client/src/hooks/SSE/useContentHandler.ts',
    'api/server/controllers/ModelController.js'
  ],
  testTimeout: 10000,
  verbose: true
}; 