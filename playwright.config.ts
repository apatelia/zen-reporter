import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function getNextTestRunName(prefix = 'Unit Tests Run'): string {
  const runsDir = path.resolve(process.cwd(), 'zen-report', 'runs');
  let count = 0;

  if (fs.existsSync(runsDir)) {
    count = fs.readdirSync(runsDir).filter((file) => file.endsWith('.jsonl')).length;
  }

  return `${prefix} #${count + 1}`;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    [
      './src/lib/reporter.ts',
      {
        projectName: 'Zen Reporter',
        testRunName: getNextTestRunName(),
        singleSummaryFile: true,
      },
    ],
  ],
  use: {
    // baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
