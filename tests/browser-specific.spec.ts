import { expect, test } from '@playwright/test';

test('skip this test in firefox', async ({ page, browserName }) => {
  test.skip(
    browserName === 'firefox',
    'a firefox specific fix is yet to be implemented, skipping test'
  );

  await page.goto('https://zen-reporter.vercel.app');

  await page.getByRole('link', { name: 'Getting Started' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Installation/);
});

test('second test to skip in firefox', async ({ page, browserName }) => {
  test.skip(
    browserName === 'firefox',
    'this feature is not yet supported by firefox, skipping test'
  );

  await page.goto('https://zen-reporter.vercel.app');

  await expect(page.getByRole('link', { name: 'Zen Reporter' })).toBeEnabled();
  await expect(page.getByRole('link', { name: 'Interactive Demo' })).toBeEnabled();
});
