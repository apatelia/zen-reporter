import { collectAllCases } from '@/lib/statsUtils';
import type { TestStep, TestSuite } from '@/lib/types/report';

export type StepCategoryKey = 'assertions' | 'actions' | 'network' | 'hooks' | 'waits' | 'others';

export interface StepCategoryConfig {
  key: StepCategoryKey;
  label: string;
  color: string;
  borderColor: string;
  description: string;
  examples: string[];
}

export const STEP_CATEGORIES: StepCategoryConfig[] = [
  {
    key: 'assertions',
    label: 'Assertions',
    color: 'var(--color-success-500, #00754a)',
    borderColor: 'var(--color-success-600, #006241)',
    description:
      'Validation steps that verify expected application state, element visibility, text values, or status codes.',
    examples: [
      "expect(page.getByText('Welcome')).toBeVisible()",
      'expect(response.status()).toBe(200)',
      'expect(locator).toHaveCount(5)',
    ],
  },
  {
    key: 'hooks',
    label: 'Hooks & Setup',
    color: 'var(--color-success-200, #94cfbd)',
    borderColor: 'var(--color-success-500, #00754a)',
    description:
      'Lifecycle hooks and fixture initializations that prepare or clean up test context before/after runs.',
    examples: [
      'beforeEach(async ({ page }) => { ... })',
      'test.beforeAll(async () => { ... })',
      'Fixture: page context setup',
    ],
  },
  {
    key: 'network',
    label: 'Network & API',
    color: 'var(--color-warning-500, #cba258)',
    borderColor: 'var(--color-warning-600, #6d4c0f)',
    description:
      'Steps making HTTP API requests, intercepting network routes, or waiting for explicit network responses.',
    examples: [
      "page.waitForResponse('**/api/v1/user')",
      "request.get('/api/health')",
      "page.route('**/data', route => route.continue())",
    ],
  },
  {
    key: 'actions',
    label: 'User Actions',
    color: 'var(--color-info-600, #1e3932)',
    borderColor: 'var(--color-info-700, #0d1a17)',
    description:
      'Direct browser interactions simulating user behavior such as navigation, clicks, keystrokes, and form inputs.',
    examples: [
      "page.goto('https://example.com/dashboard')",
      'locator.click({ force: true })',
      "page.fill('#username', 'testuser')",
    ],
  },
  {
    key: 'waits',
    label: 'Waits & Sync',
    color: 'var(--color-accent-orange, #ff6b00)',
    borderColor: 'var(--color-warning-700, #593c09)',
    description:
      'Explicit delays, element state waits, or idle pauses used for dynamic UI synchronization.',
    examples: [
      'page.waitForTimeout(1000)',
      "page.waitForSelector('.modal-loaded')",
      "page.waitForLoadState('networkidle')",
    ],
  },
  {
    key: 'others',
    label: 'Other Steps',
    color: 'var(--color-surface-700, #d5d2cb)',
    borderColor: 'var(--color-surface-800, #b4bcc1)',
    description:
      'Custom test steps, logging statements, or uncategorized auxiliary execution logic.',
    examples: [
      "test.step('Custom workflow block', ...)",
      "console.log('Checkpoint reached')",
      'attachment.save()',
    ],
  },
];

/**
 * Classifies a step title into a standardized step category key.
 *
 * @param title - Step title text to evaluate.
 * @returns Classified StepCategoryKey matching the step behavior.
 */
export function classifyStepTitle(title: string): StepCategoryKey {
  const lower = title.toLowerCase();

  if (lower.startsWith('expect') || lower.includes('expect(') || lower.includes('assert')) {
    return 'assertions';
  }

  if (
    lower.includes('waitforresponse') ||
    lower.includes('waitforrequest') ||
    lower.includes('request.') ||
    lower.includes('fetch') ||
    lower.includes('apirequestcontext') ||
    lower.includes('http')
  ) {
    return 'network';
  }

  if (
    lower.includes('waitfortimeout') ||
    lower.includes('waitforselector') ||
    lower.includes('waitforloadstate') ||
    lower.includes('sleep') ||
    lower.includes('delay') ||
    (lower.includes('wait') && !lower.includes('response') && !lower.includes('request'))
  ) {
    return 'waits';
  }

  if (
    lower.includes('beforeeach') ||
    lower.includes('aftereach') ||
    lower.includes('beforeall') ||
    lower.includes('afterall') ||
    lower.includes('fixture') ||
    lower.includes('setup') ||
    lower.includes('teardown') ||
    lower.includes('hook')
  ) {
    return 'hooks';
  }

  if (
    lower.includes('click') ||
    lower.includes('fill') ||
    lower.includes('goto') ||
    lower.includes('press') ||
    lower.includes('hover') ||
    lower.includes('check') ||
    lower.includes('type') ||
    lower.includes('select') ||
    lower.includes('drag') ||
    lower.includes('navigate') ||
    lower.includes('scroll')
  ) {
    return 'actions';
  }

  return 'others';
}

/**
 * Recursively tallies category counts for a list of test steps and nested sub-steps.
 *
 * @param steps - Array of TestStep items to process.
 * @param counts - Aggregator object tracking step counts per category.
 */
function processSteps(steps: TestStep[], counts: Record<StepCategoryKey, number>): void {
  for (const step of steps) {
    const cat = classifyStepTitle(step.title);
    counts[cat]++;

    if (step.subSteps && step.subSteps.length > 0) {
      processSteps(step.subSteps, counts);
    }
  }
}

/**
 * Recursively counts step categories for a set of test suites.
 *
 * @param suites - Array of top-level TestSuite objects.
 * @returns Map of step category keys to their aggregated occurrence counts.
 */
export function countStepCategories(suites: TestSuite[]): Record<StepCategoryKey, number> {
  const counts: Record<StepCategoryKey, number> = {
    assertions: 0,
    actions: 0,
    network: 0,
    hooks: 0,
    waits: 0,
    others: 0,
  };

  const allCases = collectAllCases(suites);
  for (const tc of allCases) {
    if (tc.steps && tc.steps.length > 0) {
      processSteps(tc.steps, counts);
    }
  }

  return counts;
}
