import { expect, test } from '@playwright/test';

test.use({ video: 'on' });

test(
  'get started link with video recording',
  {
    tag: ['@link', '@heading', '@video'],
  },
  async ({ page }) => {
    await page.goto('https://playwright.dev/');

    // Click the get started link.
    await page.getByRole('link', { name: 'Get started' }).click();

    // Expects page to have a heading with the name of Installation.
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  }
);
