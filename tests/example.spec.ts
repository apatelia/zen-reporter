import { expect, test } from '@playwright/test';

test.describe('Example Tests', () => {
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
      annotation: [
        {
          type: 'test',
          description: 'Verifies that get started link redirects to the Installation instructions',
        },
      ],
    },
    async ({ page, browserName }, testInfo) => {
      await test.step("Go to Playwright's website", async () => {
        await page.goto('https://playwright.dev/');
      });

      await test.step('Click the get started link', async () => {
        await page.getByRole('link', { name: 'Get started' }).click();
      });

      await test.step('Expects page to have a heading with the name of Installation', async () => {
        await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();

        if (browserName === 'chromium') {
          console.log('attaching screenshot for chromium');

          const screenshotPath = 'screenshots/Installation.png';
          await page.screenshot({ fullPage: false, path: screenshotPath });
          await testInfo.attach('Installation Screenshot', {
            path: screenshotPath,
            contentType: 'image/png',
          });

          console.log('successfully attached screenshot');
        }
      });
    }
  );
});
