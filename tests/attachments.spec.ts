import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

test.use({ video: 'on', trace: 'on' });

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

test(
  'zen reporter search feature with video recording',
  {
    tag: ['@attachment'],
  },
  async ({ page, browserName }, testInfo) => {
    await page.goto('https://zen-reporter.vercel.app');

    // Click the Getting started link.
    await page.getByRole('link', { name: 'Getting started' }).click();

    // Wait for page heading to appear.
    await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible', timeout: 10_000 });

    // Get 'On this page' TOC text.
    const toc = page.getByRole('navigation', { name: 'On this page' });
    const tocText = await toc.innerText();

    // Read note and save it as a text file attachment.
    const note = page.getByRole('complementary', { name: 'Note' });
    const noteText = await note.innerText();
    const noteFilePath = testInfo.outputPath('Note.txt');

    const textToWrite = `${noteText}\n\n${tocText}`;
    await fs.writeFile(noteFilePath, textToWrite);
    await testInfo.attach('Note text', {
      path: noteFilePath,
      contentType: 'text/plain',
    });

    //Click the "Search" in header.
    const searchButton = page.getByRole('button', { name: 'Search' });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Search for `zr history`.
    const searchDialog = page.getByRole('dialog', { name: 'Search' });
    const searchInput = searchDialog.getByRole('textbox', { name: 'Search' });
    await searchInput.focus();
    await searchInput.fill('zr history');

    // Take screenshot.
    const screenshotPath = testInfo.outputPath(`Search-${browserName}.png`);
    await page.screenshot({ fullPage: false, path: screenshotPath });
    await testInfo.attach('Search Screenshot', {
      path: screenshotPath,
      contentType: 'image/png',
    });

    // Find and click on `zr history (DuckDB Analytics Engine)` search result
    const resultsList = searchDialog.getByRole('list');
    const zrHistoryLink = resultsList.getByRole('link', {
      name: '3. zr history (DuckDB Analytics Engine)',
    });
    await expect(zrHistoryLink).toBeEnabled();
    await zrHistoryLink.click();

    // Verify that we are on zr CLI page.
    await expect(page).toHaveTitle(/^zr - The Zen Reporter CLI/);

    // Verify that `zr history` sub-command section is visible.
    const zrHistoryHeading = page.getByRole('heading', {
      name: '3. zr history (DuckDB Analytics Engine)',
      level: 3,
    });
    await expect(zrHistoryHeading).toBeVisible();
  }
);
