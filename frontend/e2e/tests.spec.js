const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

test.describe('E2E: Authentication Flow', () => {
  test('should signup and login successfully', async ({ page }) => {
    // Visit signup page
    await page.goto(`${BASE_URL}/signup`);
    
    // Fill signup form
    const email = `user-${Date.now()}@example.com`;
    const password = 'SecurePassword123!';
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    
    // Submit signup
    await page.click('button[type="submit"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    
    // Login
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Should reach dashboard
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Error message should appear
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    // Logout
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });
});

test.describe('E2E: Analysis Creation and Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('should create new analysis', async ({ page }) => {
    // Navigate to Summarize page
    await page.click('a:has-text("Summarize")');
    await page.waitForURL(`${BASE_URL}/summarize`);
    
    // Fill form
    const textContent = 'Meeting discussion about Q1 strategy, revenue targets, ' +
                       'team expansion, and timeline. Key decision: approve budget.';
    
    await page.fill('[data-testid="raw-text"]', textContent);
    
    // Select template if available
    const templateSelect = page.locator('[data-testid="template-select"]');
    if (await templateSelect.isVisible()) {
      await templateSelect.selectOption('meeting');
    }
    
    // Submit
    await page.click('button:has-text("Analyze")');
    
    // Should show analysis results
    await page.waitForURL(`${BASE_URL}/analysis/*`);
    await expect(page.locator('text=Analysis Results')).toBeVisible();
  });

  test('should save analysis as draft', async ({ page }) => {
    await page.click('a:has-text("Summarize")');
    
    const textContent = 'Draft content for testing auto-save feature functionality.';
    await page.fill('[data-testid="raw-text"]', textContent);
    
    // Use keyboard shortcut Ctrl+S to save
    await page.keyboard.press('Control+S');
    
    // Check for save confirmation
    await expect(page.locator('text=Saving')).toBeVisible({ timeout: 1000 });
  });

  test('should view analysis details', async ({ page }) => {
    // Go to Dashboard first
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Click on an analysis item
    const analysisItem = page.locator('[data-testid="analysis-item"]').first();
    await analysisItem.click();
    
    // Should be in analysis page
    await page.waitForURL(`${BASE_URL}/analysis/*`);
    
    // Check for analysis content
    await expect(page.locator('text=Summary')).toBeVisible();
    await expect(page.locator('text=Tasks')).toBeVisible();
  });

  test('should export analysis as JSON', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const analysisItem = page.locator('[data-testid="analysis-item"]').first();
    await analysisItem.click();
    
    await page.waitForURL(`${BASE_URL}/analysis/*`);
    
    // Click export button
    await page.click('[data-testid="export-button"]');
    
    // Select JSON format
    await page.click('[data-testid="export-json"]');
    
    // Should trigger download
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.json');
  });
});

test.describe('E2E: Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('should create task from dashboard', async ({ page }) => {
    // Click create task button
    await page.click('[data-testid="create-task-button"]');
    
    // Modal should appear
    await expect(page.locator('text=Create Task')).toBeVisible();
    
    // Fill task details
    await page.fill('input[name="title"]', 'Review Proposal');
    await page.fill('textarea[name="description"]', 'Review the Q1 proposal');
    await page.selectOption('select[name="priority"]', 'High');
    
    // Set deadline
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);
    
    // Submit
    await page.click('button:has-text("Create")');
    
    // Task should appear in list
    await expect(page.locator('text=Review Proposal')).toBeVisible();
  });

  test('should update task status', async ({ page }) => {
    const taskItem = page.locator('[data-testid="task-item"]').first();
    await taskItem.click();
    
    // Change status dropdown
    await page.selectOption('[data-testid="task-status"]', 'completed');
    
    // Status should update
    await expect(page.locator('[data-testid="task-status"]')).toHaveValue('completed');
  });

  test('should bulk update tasks', async ({ page }) => {
    // Select multiple tasks
    const checkboxes = page.locator('input[type="checkbox"][data-testid="task-checkbox"]');
    const count = await checkboxes.count();
    
    if (count >= 2) {
      // Select first two
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // Bulk action button should appear
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      
      // Change priority for all
      await page.selectOption('[data-testid="bulk-priority"]', 'High');
      await page.click('[data-testid="bulk-apply"]');
      
      // Confirmation message
      await expect(page.locator('text=Updated')).toBeVisible();
    }
  });

  test('should delete task', async ({ page }) => {
    const taskItem = page.locator('[data-testid="task-item"]').first();
    
    // Right-click context menu (or click delete button)
    await taskItem.hover();
    await page.click('[data-testid="task-delete-button"]');
    
    // Confirmation dialog
    await expect(page.locator('text=Delete this task')).toBeVisible();
    
    // Confirm delete
    await page.click('[data-testid="confirm-delete"]');
    
    // Task should be removed
    await expect(taskItem).not.toBeVisible({ timeout: 1000 });
  });
});

test.describe('E2E: Real-time Collaboration', () => {
  test('should share analysis with user', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    // Go to analysis page
    const analysisItem = page.locator('[data-testid="analysis-item"]').first();
    await analysisItem.click();
    
    // Click share button
    await page.click('[data-testid="share-button"]');
    
    // Share dialog should appear
    await expect(page.locator('text=Share Analysis')).toBeVisible();
    
    // Enter email and permission level
    await page.fill('[data-testid="share-email"]', 'colleague@example.com');
    await page.selectOption('[data-testid="share-role"]', 'Editor');
    
    // Submit
    await page.click('[data-testid="share-submit"]');
    
    // Success message
    await expect(page.locator('text=Shared successfully')).toBeVisible();
  });

  test('should add comment to analysis', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    // Go to analysis
    const analysisItem = page.locator('[data-testid="analysis-item"]').first();
    await analysisItem.click();
    
    // Scroll to comments section
    await page.locator('[data-testid="comments-section"]').scrollIntoViewIfNeeded();
    
    // Add comment
    await page.fill('[data-testid="comment-input"]', 'Great analysis! This looks accurate.');
    await page.click('[data-testid="comment-submit"]');
    
    // Comment should appear
    await expect(page.locator('text=Great analysis')).toBeVisible();
  });

  test('should view activity log', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    // Go to analysis
    const analysisItem = page.locator('[data-testid="analysis-item"]').first();
    await analysisItem.click();
    
    // Click activity tab
    await page.click('[data-testid="activity-tab"]');
    
    // Activity log should display
    await expect(page.locator('[data-testid="activity-log"]')).toBeVisible();
    await expect(page.locator('text=created by')).toBeVisible();
  });
});

test.describe('E2E: UI Features', () => {
  test('should toggle dark mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    // Click dark mode toggle
    const toggle = page.locator('[data-testid="theme-toggle"]');
    await toggle.click();
    
    // Check if dark mode is applied
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('should use keyboard shortcuts', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    // Press Ctrl+K to open command palette/shortcuts help
    await page.keyboard.press('Control+K');
    
    // Shortcuts help should appear
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
  });

  test('should show responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Mobile menu should be visible
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    const isVisible = await mobileMenu.isVisible().catch(() => false);
    
    // Or check for hamburger button
    const hamburger = page.locator('[data-testid="hamburger-button"]');
    if (!isVisible && await hamburger.isVisible()) {
      await hamburger.click();
      await expect(mobileMenu).toBeVisible();
    }
  });
});

test.describe('E2E: Performance', () => {
  test('should load dashboard in acceptable time', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle bulk operations without lag', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    // Select bulk of checkboxes
    const checkboxes = page.locator('input[type="checkbox"][data-testid="task-checkbox"]');
    
    const startTime = Date.now();
    for (let i = 0; i < Math.min(10, await checkboxes.count()); i++) {
      await checkboxes.nth(i).check();
    }
    const selectionTime = Date.now() - startTime;
    
    // Should respond quickly
    expect(selectionTime).toBeLessThan(2000);
  });
});
