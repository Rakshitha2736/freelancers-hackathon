// backend/tests/setup.js

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-very-secure-string';
process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test';

// Suppress console logs during tests (optional)
// global.console.log = jest.fn();
// global.console.error = jest.fn();
// global.console.warn = jest.fn();

// Setup test timeouts
jest.setTimeout(30000);

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Add cleanup code here if needed
});
