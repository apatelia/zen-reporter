import { expect, test } from '@playwright/test';
import {
  classifyStepTitle,
  countStepCategories,
  STEP_CATEGORIES,
} from '../src/lib/stepCategoryClassifier';
import type { TestStep, TestSuite } from '../src/lib/types/report';

function mockStep(title: string, subSteps?: TestStep[]): TestStep {
  return {
    title,
    duration: 10,
    status: 'passed',
    annotations: [],
    attachments: [],
    error: null,
    subSteps,
  };
}

test.describe('Step Category Classifier & Trends', () => {
  test.describe('classifyStepTitle', () => {
    test('classifies assertions correctly', () => {
      expect(classifyStepTitle('Expect "toBe"')).toBe('assertions');
      expect(classifyStepTitle('expect(response.status()).toBe(200)')).toBe('assertions');
      expect(classifyStepTitle('assert.equal(a, b)')).toBe('assertions');
      expect(classifyStepTitle('Expect "toBeOK"')).toBe('assertions');
      expect(classifyStepTitle('Expect "toBeVisible"')).toBe('assertions');
    });

    test('classifies Playwright native HTTP methods and API calls as network', () => {
      // Native Playwright step titles for request fixture calls
      expect(classifyStepTitle('GET')).toBe('network');
      expect(classifyStepTitle('POST')).toBe('network');
      expect(classifyStepTitle('PUT')).toBe('network');
      expect(classifyStepTitle('DELETE')).toBe('network');
      expect(classifyStepTitle('PATCH')).toBe('network');
      expect(classifyStepTitle('HEAD')).toBe('network');
      expect(classifyStepTitle('OPTIONS')).toBe('network');

      // HTTP methods with paths or URLs
      expect(classifyStepTitle('GET /api/v1/users')).toBe('network');
      expect(classifyStepTitle('POST https://example.com/api/login')).toBe('network');
      expect(classifyStepTitle('PUT /api/items/123')).toBe('network');
      expect(classifyStepTitle('DELETE /api/items/123')).toBe('network');
      expect(classifyStepTitle('request.get("/api/health")')).toBe('network');
      expect(classifyStepTitle('apiRequestContext.post')).toBe('network');
      expect(classifyStepTitle('fetch("/api/data")')).toBe('network');
      expect(classifyStepTitle('Create request context')).toBe('network');
    });

    test('classifies browser route interception and response waiting as network', () => {
      expect(classifyStepTitle('Route "**/api/v1/user"')).toBe('network');
      expect(classifyStepTitle("page.route('**/data', route => route.continue())")).toBe('network');
      expect(classifyStepTitle('route.fulfill')).toBe('network');
      expect(classifyStepTitle('route.continue')).toBe('network');
      expect(classifyStepTitle('Wait for event "response"')).toBe('network');
      expect(classifyStepTitle("page.waitForResponse('**/api/v1/user')")).toBe('network');
      expect(classifyStepTitle('Wait for event "request"')).toBe('network');
      expect(classifyStepTitle("page.waitForRequest('**/api/v1/user')")).toBe('network');
      expect(classifyStepTitle('GraphQL query execute')).toBe('network');
      expect(classifyStepTitle('WebSocket message send')).toBe('network');
    });

    test('classifies explicit waits correctly and distinguishes from network idle', () => {
      expect(classifyStepTitle('page.waitForTimeout(1000)')).toBe('waits');
      expect(classifyStepTitle('Wait for selector')).toBe('waits');
      expect(classifyStepTitle('page.waitForSelector(".modal-loaded")')).toBe('waits');
      expect(classifyStepTitle('page.waitForLoadState("networkidle")')).toBe('waits');
      expect(classifyStepTitle('sleep(500)')).toBe('waits');
      expect(classifyStepTitle('delay')).toBe('waits');
    });

    test('classifies hooks and setup correctly', () => {
      expect(classifyStepTitle('Before Hooks')).toBe('hooks');
      expect(classifyStepTitle('After Hooks')).toBe('hooks');
      expect(classifyStepTitle('Fixture "browser"')).toBe('hooks');
      expect(classifyStepTitle('Fixture "context"')).toBe('hooks');
      expect(classifyStepTitle('Fixture "page"')).toBe('hooks');
      expect(classifyStepTitle('beforeEach hook')).toBe('hooks');
      expect(classifyStepTitle('setup test context')).toBe('hooks');
      expect(classifyStepTitle('teardown database')).toBe('hooks');
    });

    test('classifies user actions correctly', () => {
      expect(classifyStepTitle('Click')).toBe('actions');
      expect(classifyStepTitle('Fill "zr history"')).toBe('actions');
      expect(classifyStepTitle('Navigate')).toBe('actions');
      expect(classifyStepTitle('page.goto("https://zen-reporter.vercel.app")')).toBe('actions');
      expect(classifyStepTitle('locator.press("Enter")')).toBe('actions');
      expect(classifyStepTitle('Hover')).toBe('actions');
      expect(classifyStepTitle('Select option')).toBe('actions');
    });

    test('does not classify action locators as network', () => {
      // Locators that start with 'Get' should not be misclassified as HTTP GET
      expect(classifyStepTitle('Get by role')).toBe('actions');
      expect(classifyStepTitle('Get by text')).toBe('actions');
      expect(classifyStepTitle('Get started')).not.toBe('network');
    });
  });

  test.describe('countStepCategories', () => {
    test('accurately calculates counts and percentages for all categories including network', () => {
      const mockSuites: TestSuite[] = [
        {
          title: 'API & Browser Suite',
          cases: [
            {
              title: 'API test with HTTP steps',
              parent: 'API & Browser Suite',
              project: 'chromium',
              fileName: 'tests/mock.spec.ts',
              status: 'passed',
              duration: 250,
              steps: [
                mockStep('Before Hooks', [mockStep('Create request context')]),
                mockStep('GET'),
                mockStep('Expect "toBeOK"'),
                mockStep('Expect "toBe"'),
                mockStep('After Hooks'),
              ],
            },
            {
              title: 'Browser test with route interception and actions',
              parent: 'API & Browser Suite',
              project: 'chromium',
              fileName: 'tests/mock.spec.ts',
              status: 'passed',
              duration: 400,
              steps: [
                mockStep('Navigate'),
                mockStep('Route "**/api/data"'),
                mockStep('Click'),
                mockStep('Wait for event "response"'),
                mockStep('Wait for selector'),
                mockStep('Expect "toBeVisible"'),
                mockStep('Console log output'),
              ],
            },
          ],
        },
      ];

      const counts = countStepCategories(mockSuites);

      // Verify category counts
      expect(counts.network).toBe(4); // 'Create request context', 'GET', 'Route "**/api/data"', 'Wait for event "response"'
      expect(counts.assertions).toBe(3); // 'Expect "toBeOK"', 'Expect "toBe"', 'Expect "toBeVisible"'
      expect(counts.actions).toBe(2); // 'Navigate', 'Click'
      expect(counts.waits).toBe(1); // 'Wait for selector'
      expect(counts.hooks).toBe(2); // 'Before Hooks', 'After Hooks'
      expect(counts.others).toBe(1); // 'Console log output'

      const totalSteps = Object.values(counts).reduce((sum, n) => sum + n, 0);
      expect(totalSteps).toBe(13);

      // Verify percentage calculations as done in StepCategoryTrend.tsx
      const networkPercentage = Math.round((counts.network / totalSteps) * 1000) / 10;
      expect(networkPercentage).toBe(30.8);
      expect(networkPercentage).toBeGreaterThan(0);

      // Verify that all STEP_CATEGORIES keys exist
      for (const cat of STEP_CATEGORIES) {
        expect(counts[cat.key]).toBeDefined();
        expect(typeof counts[cat.key]).toBe('number');
      }
    });

    test('maintains consistent category labels and ordering matching summary cards and legends', () => {
      const expectedCategories = [
        { key: 'assertions', label: 'Assertions' },
        { key: 'hooks', label: 'Hooks & Setup' },
        { key: 'network', label: 'Network & API' },
        { key: 'actions', label: 'User Actions' },
        { key: 'waits', label: 'Waits & Sync' },
        { key: 'others', label: 'Other Steps' },
      ];

      expect(STEP_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))).toEqual(
        expectedCategories
      );

      // Verify that Network & API and Waits & Sync use distinct color definitions
      const networkCat = STEP_CATEGORIES.find((c) => c.key === 'network');
      const waitsCat = STEP_CATEGORIES.find((c) => c.key === 'waits');
      expect(networkCat).toBeDefined();
      expect(waitsCat).toBeDefined();
      expect(networkCat?.color).not.toEqual(waitsCat?.color);
      expect(networkCat?.borderColor).not.toEqual(waitsCat?.borderColor);
    });
  });
});
