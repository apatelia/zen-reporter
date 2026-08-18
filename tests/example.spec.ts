import { expect, test } from '@playwright/test';

test.describe('Example Tests', () => {
  test(
    'has title',
    {
      tag: ['@title'],
    },
    async ({ page }) => {
      await test.step("Go to Playwright's website", async () => {
        await page.goto('https://playwright.dev/');
      });

      await test.step('Expect a title to contain "Playwright"', async () => {
        await expect(page).toHaveTitle(/Playwright/);
      });
    }
  );

  test(
    'get started link',
    {
      tag: ['@link', '@heading'],
    },
    async ({ page }) => {
      await test.step("Go to Playwright's website", async () => {
        await page.goto('https://playwright.dev/');
      });

      await test.step('Click the get started link', async () => {
        await page.getByRole('link', { name: 'Get started' }).click();
      });

      await test.step('Expects page to have a heading with the name of Installation', async () => {
        await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
      });
    }
  );
});
