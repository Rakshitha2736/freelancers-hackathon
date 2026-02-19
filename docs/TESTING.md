# Testing Guide

## Overview

This project follows a comprehensive testing strategy with unit tests, integration tests, and E2E tests to ensure code quality and reliability.

### Test Stack
- **Jest** - Unit and integration testing framework
- **Supertest** - HTTP assertion library for API testing
- **Playwright** - End-to-end browser testing
- **MongoDB Memory Server** - In-memory MongoDB for fast tests

---

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Backend Tests
```bash
cd backend

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# All tests with coverage
npm run test

# Specific test file
npm test -- unit.test.js

# Watch mode
npm run test:watch

# Debug tests
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Coverage report
npm run test:coverage

# Watch mode
npm test -- --watch

# Debug tests
npm test -- --inspect-brk
```

### E2E Tests
```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests.spec.js

# Run tests in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

---

## Test Structure

### Backend Tests

#### `backend/tests/unit.test.js`
Unit tests for utilities and helper functions:
- `CacheManager` - Cache operations and TTL
- `Input Validation Schemas` - Email, task, text validation
- `Cache Invalidation` - Pattern-based cache clearing

```bash
npm run test:unit -- unit.test.js
```

#### `backend/tests/notification.test.js`
Tests for email and notification services:
- `Email Service` - Template generation and sending
- `Notification Scheduler` - Cron patterns and batch processing
- `Date Calculations` - Deadline and overdue logic
- `Digest Generation` - Weekly summary aggregation

```bash
npm run test:unit -- notification.test.js
```

#### `backend/tests/integration.test.js`
Integration tests for complete workflows:
- User authentication (signup, login, logout)
- Analysis creation and management
- Task operations (CRUD)
- Sharing and permissions
- Comment threads
- Activity logging

```bash
npm run test:integration
```

### Frontend Tests

#### Component Tests
```javascript
// frontend/src/__tests__/components/Dashboard.test.js
describe('Dashboard Component', () => {
  test('should render dashboard with analyses', () => {
    // Test implementation
  });
});
```

Run with:
```bash
npm test -- Dashboard.test.js
```

#### Hook Tests
```javascript
// frontend/src/__tests__/hooks/useSocket.test.js
describe('useSocket Hook', () => {
  test('should connect to WebSocket server', () => {
    // Test implementation
  });
});
```

#### Utility Tests
```javascript
// frontend/src/__tests__/utils/exportUtils.test.js
describe('Export Utilities', () => {
  test('should export to JSON format', () => {
    // Test implementation
  });
});
```

### E2E Tests

#### Authentication Tests
```javascript
test('should signup and login successfully', async ({ page }) => {
  await page.goto(`${BASE_URL}/signup`);
  // Test signup and login flow
});
```

#### Feature Tests
```javascript
test('should create new analysis', async ({ page }) => {
  // Test complete analysis creation workflow
});
```

#### Collaboration Tests
```javascript
test('should share analysis with user', async ({ page }) => {
  // Test sharing and permission features
});
```

Run specific test suite:
```bash
npx playwright test --grep "Authentication"
```

---

## Writing New Tests

### Unit Test Template
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  test('should do something specific', () => {
    const input = { /* test data */ };
    const expected = { /* expected result */ };
    
    const result = functionToTest(input);
    
    expect(result).toEqual(expected);
  });

  test('should handle error cases', () => {
    expect(() => functionToTest(null)).toThrow();
  });
});
```

### Integration Test Template
```javascript
describe('API Endpoint', () => {
  let app; // Express app
  let db; // MongoDB connection

  beforeAll(async () => {
    app = require('../server');
    await connectTestDB();
  });

  afterEach(async () => {
    await cleanupTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  test('POST /api/analyses should create analysis', async () => {
    const response = await request(app)
      .post('/api/analyses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Test analysis',
        content: 'Meeting notes...'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
  });
});
```

### Component Test Template (React)
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

describe('Dashboard Component', () => {
  test('should render list of analyses', () => {
    render(<Dashboard />);
    
    const title = screen.getByText('Dashboard');
    expect(title).toBeInTheDocument();
  });

  test('should handle create analysis click', () => {
    render(<Dashboard />);
    
    const button = screen.getByRole('button', { name: /create/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Create Analysis')).toBeInTheDocument();
  });
});
```

### E2E Test Template
```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test('should complete user journey', async ({ page }) => {
    // Navigate
    await page.goto('http://localhost:3000');
    
    // Interact
    await page.fill('input[name="email"]', 'user@example.com');
    await page.click('button[type="submit"]');
    
    // Assert
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

---

## Test Coverage

### Current Coverage Targets
```
Statements   : 80% (implemented)
Branches     : 75% (implemented)
Functions    : 85% (implemented)
Lines        : 80% (implemented)
```

### View Coverage Report
```bash
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage by Module
```
├── backend/
│   ├── services/ ...................... 85% ✓
│   ├── models/ ......................... 80% ✓
│   ├── routes/ ......................... 75% ✓
│   ├── middleware/ ..................... 90% ✓
│   └── utils/ .......................... 88% ✓
│
└── frontend/
    ├── components/ ..................... 70%
    ├── context/ ........................ 75%
    ├── hooks/ .......................... 80%
    └── utils/ .......................... 85% ✓
```

---

## Common Testing Patterns

### Mocking Database
```javascript
jest.mock('../models/User');

test('should fetch user', async () => {
  User.findById.mockResolvedValue({ _id: '123', name: 'John' });
  
  const user = await User.findById('123');
  expect(user.name).toBe('John');
});
```

### Mocking API Calls
```javascript
import axios from 'axios';
jest.mock('axios');

test('should fetch analyses', async () => {
  axios.get.mockResolvedValue({
    data: [{ _id: '1', title: 'Analysis 1' }]
  });
  
  const data = await axios.get('/api/analyses');
  expect(data.data).toHaveLength(1);
});
```

### Testing Async Code
```javascript
test('should handle async operation', async () => {
  const result = await fetchData();
  
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
});
```

### Testing Errors
```javascript
test('should throw error on invalid input', () => {
  expect(() => {
    validateEmail('invalid');
  }).toThrow('Invalid email format');
});

test('should reject promise on error', async () => {
  await expect(fetchData()).rejects.toThrow();
});
```

### Testing WebSocket/Events
```javascript
test('should emit socket event', async () => {
  const socket = io(IO_URL);
  const callback = jest.fn();
  
  socket.on('task:updated', callback);
  socket.emit('task:update', { taskId: '1' });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(callback).toHaveBeenCalled();
});
```

---

## Debugging Tests

### Debug Individual Test
```bash
node --inspect-brk node_modules/.bin/jest --runInBand test.js
# Then open chrome://inspect
```

### Debug with Console Logs
```javascript
test('debugging test', () => {
  console.log('Debug info:', data);
  // Test code
});

npm test -- --verbose
```

### Debug E2E Tests
```bash
npx playwright test --debug test.spec.js

# Or use headed mode with slowMo
npx playwright test --headed --debug test.spec.js
```

---

## CI/CD Integration

### GitHub Actions Workflow
Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

```yaml
# Triggered by .github/workflows/ci-cd.yml
- Unit Tests (Backend & Frontend)
- Integration Tests
- E2E Tests
- Security Scan (npm audit, Snyk)
```

### Check CI Status
```bash
# Local verification before push
npm test
npm run test:coverage
npx playwright test
```

---

## Test Best Practices

### ✅ Do
- Write tests for critical functionality
- Use descriptive test names
- Keep tests independent (no dependencies between tests)
- Test one thing per test
- Use fixtures for common setup
- Mock external dependencies
- Test edge cases and error scenarios

### ❌ Don't
- Skip failing tests (use `.skip` only temporarily)
- Create flaky tests that fail randomly
- Make tests dependent on execution order
- Test implementation details instead of behavior
- Write overly complex test logic
- Mix multiple concerns in one test

---

## Troubleshooting Tests

### "MongoDB connection error"
```bash
# Start local MongoDB
npm run db:start

# Or use memory server (should be automatic)
```

### "Port already in use"
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### "Timeout expired"
```javascript
// Increase timeout for slow tests
jest.setTimeout(30000);
// in Playwright
test('slow test', async ({ page }) => {
  // test code
}, { timeout: 30000 });
```

### "WebSocket connection failed"
```bash
# Ensure backend server is running
npm run server

# Check CORS configuration
```

---

## Test Metrics & Reporting

### Metrics to Track
- Test pass/fail rate
- Code coverage percentage
- Test execution time
- Flaky test detection
- Test maintenance cost

### Generate Reports
```bash
# JSON report
npm run test -- --json --outputFile=report.json

# Coverage HTML report
npm run test:coverage

# Playwright HTML report
npx playwright show-report
```

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Testing](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated**: 2025-03-01
**Maintainers**: Development Team
