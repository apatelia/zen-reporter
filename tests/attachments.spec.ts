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
    await testInfo.attach('Note', {
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
    await expect(zrHistoryLink).toBeEnabled({ timeout: 10_000 });
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

test(
  'attaches various text formats supported for syntax highlighting',
  {
    tag: ['@attachment', '@syntax-highlighting'],
  },
  // eslint-disable-next-line no-empty-pattern
  async ({}, testInfo) => {
    // 1. JSON attachment
    const sampleJson = {
      reporter: 'zen-reporter',
      version: '0.14.2',
      features: {
        syntaxHighlighting: true,
        supportedLanguages: ['json', 'markdown', 'javascript', 'typescript'],
      },
      metrics: {
        totalTests: 12,
        passRate: 100,
      },
    };
    await testInfo.attach('config-sample.json', {
      body: JSON.stringify(sampleJson, null, 2),
      contentType: 'application/json',
    });

    // 2. Markdown attachment
    const sampleMarkdown = [
      '# Zen Reporter Test Run',
      '',
      '> Automated execution context generated during test run.',
      '',
      '## Highlights',
      '- **Language detection**: Automatic from file extension or MIME type',
      '- **Inline styling**: Backticks like `code` and [links](https://playwright.dev)',
      '',
      '```typescript',
      'const isReady = true;',
      '```',
    ].join('\n');
    await testInfo.attach('execution-notes.md', {
      body: sampleMarkdown,
      contentType: 'text/markdown',
    });

    // 3. TypeScript attachment
    const sampleTypeScript = [
      "import { test, expect } from '@playwright/test';",
      '',
      'interface UserSession {',
      '  id: string;',
      '  authenticated: boolean;',
      '}',
      '',
      'export async function verifySession(session: UserSession): Promise<boolean> {',
      '  // Check session validity',
      '  if (!session.authenticated) {',
      '    return false;',
      '  }',
      '  return session.id.length > 0;',
      '}',
    ].join('\n');
    await testInfo.attach('helper-snippet.ts', {
      body: sampleTypeScript,
      contentType: 'text/plain',
    });

    // 4. JavaScript attachment
    const sampleJavaScript = [
      '// Sample client script',
      'function calculateSummary(items) {',
      '  const total = items.length;',
      '  const active = items.filter(item => item.active);',
      '  return { total, activeCount: active.length };',
      '}',
    ].join('\n');
    await testInfo.attach('utility.js', {
      body: sampleJavaScript,
      contentType: 'text/javascript',
    });

    // 5. Plain log attachment
    const sampleLog = [
      '[INFO] 2026-10-16 00:28:00 Initializing application context',
      '[INFO] 2026-10-16 00:28:01 Service endpoints registered successfully',
      '[DEBUG] 2026-10-16 00:28:02 Health check probe status: OK (200)',
    ].join('\n');
    await testInfo.attach('application.log', {
      body: sampleLog,
      contentType: 'text/plain',
    });
  }
);

test(
  'attaches archive and binary unknown file types to test attachment icons and preview modes',
  {
    tag: ['@attachment', '@archive', '@binary'],
  },
  // eslint-disable-next-line no-empty-pattern
  async ({}, testInfo) => {
    // 1. Archive file (.zip) - tests archive icon and preview mode
    const dummyZipHeader = Buffer.from([
      0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    await testInfo.attach('test-artifacts.zip', {
      body: dummyZipHeader,
      contentType: 'application/zip',
    });

    // 2. Tarball archive (.tar.gz) - tests tar.gz archive detection
    const dummyGzipHeader = Buffer.from([
      0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
    ]);
    await testInfo.attach('backup-archive.tar.gz', {
      body: dummyGzipHeader,
      contentType: 'application/gzip',
    });

    // 3. Generic binary file (.bin) - tests standard unknown binary file icon & preview fallback
    const genericBinary = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd, 0xfc]);
    await testInfo.attach('firmware-dump.bin', {
      body: genericBinary,
      contentType: 'application/octet-stream',
    });

    // 4. Custom unknown file extension (.dat)
    const datFile = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]);
    await testInfo.attach('sensor-telemetry.dat', {
      body: datFile,
      contentType: 'application/octet-stream',
    });
  }
);
