import { expect, test } from '@playwright/test';

test(
  'has title',
  {
    tag: ['@title'],
    annotation: [
      {
        type: 'test',
        description: 'Verifies that the page title contains "Playwright"',
      },
    ],
  },
  async ({ page }) => {
    await page.goto('https://playwright.dev/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Playwright/);
  }
);

test(
  'get started link',
  {
    tag: ['@link', '@heading'],
    annotation: [
      {
        type: 'test',
        description: 'Verifies that get started link redirects to the Installation instructions',
      },
    ],
  },
  async ({ page }) => {
    await page.goto('https://playwright.dev/');

    // Click the get started link.
    await page.getByRole('link', { name: 'Get started' }).click();

    // Expects page to have a heading with the name of Installation.
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  }
);
