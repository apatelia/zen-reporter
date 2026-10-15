import { expect, test } from '@playwright/test';

test.fail(
  'should fail',
  {
    tag: ['@failure', '@explicit-wait'],
  },
  async ({ page }) => {
    console.log('This test should fail');

    // Go to Zen Reporter's home page
    await page.goto('https://zen-reporter.vercel.app');

    // Wait for "Getting Started" link-button to be visible
    await page
      .getByRole('link', { name: 'Getting Started' })
      .waitFor({ state: 'visible', timeout: 10_000 });

    // Expect a "GitHub" button on homepage
    const githubButton = page.getByRole('button', { name: 'GitHub' });
    console.error('There should not be any "GitHub" button on the page.');
    await expect(githubButton).toBeVisible();
  }
);

test.fixme(
  'to be fixed',
  {
    tag: ['@fixme'],
  },
  async () => {
    console.debug('empty test');
    await test.step('empty step - this step needs to be fixed', async () => {});
  }
);

test.skip(
  'Skipped test',
  {
    tag: ['@skip'],
  },
  async () => {
    console.debug('skipped test');
    await test.step('this step will be skipped', async () => {});
  }
);

test.fail(
  'should time out',
  {
    tag: ['@timeout'],
  },
  async ({ page, browserName }) => {
    test.skip(browserName === 'chromium', 'skipping test intentionally in chromium');

    // Go to Zen Reporter's home page
    await page.goto('https://zen-reporter.vercel.app');

    // Wait for "Getting Started" link-button to be visible
    await page
      .getByRole('link', { name: 'Getting Started' })
      .waitFor({ state: 'visible', timeout: 10_000 });

    // Expect a "GitHub" button on homepage
    const githubButton = page.getByRole('button', { name: 'GitHub' });
    await expect(githubButton).toBeVisible({ timeout: 45_000 });
  }
);
