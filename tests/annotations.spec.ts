import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test(
  'Test a webpage AFTER FIXING accessibility issues',
  {
    tag: ['@accessibility'],
    annotation: [
      {
        type: 'accessibility test',
        description: 'Tests a page for accessibility issues',
      },
    ],
  },
  async ({ page }, testInfo) => {
    test.skip(process.env.CI != undefined, 'Skipping failing accessibility test on CI');

    await page.goto('https://www.washington.edu/accesscomputing/AU/after.html');
    await page
      .getByRole('button', { name: 'Short list of accessibility issues, opens in a dialog' })
      .waitFor({ state: 'visible', timeout: 10_000 });

    // Run the automated accessibility tests
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();

    // Attach accessibility test results to test report, in JSON format.
    await testInfo.attach('accessibility-scan-results.json', {
      body: JSON.stringify(accessibilityScanResults, null, 2),
      contentType: 'application/json',
    });

    // Verify that there is no WCAG violation.
    expect(accessibilityScanResults.violations).toEqual([]);
  }
);
