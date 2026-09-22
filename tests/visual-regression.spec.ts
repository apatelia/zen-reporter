import { expect, test } from '@playwright/test';

test(
  'visual regression comparison failure',
  {
    tag: ['@visual', '@failure'],
  },
  async ({ page }) => {
    // Render a simple HTML page on screen
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: system-ui, sans-serif;
              background-color: #0f172a;
              color: #f8fafc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .card {
              background: #1e293b;
              padding: 32px;
              border-radius: 16px;
              border: 2px solid #334155;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
              text-align: center;
              max-w: 400px;
            }
            .badge {
              background: #38bdf8;
              color: #0f172a;
              font-weight: bold;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 14px;
            }
            h1 { margin-top: 16px; font-size: 24px; color: #38bdf8; }
            p { color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">ACTUAL STATE</span>
            <h1>Zen Reporter Visual Diff</h1>
            <p>This element has changed styling and content vs baseline!</p>
          </div>
        </body>
      </html>
    `);

    // First screenshot (Actual screenshot taken in test)
    const actualBuffer = await page.screenshot();

    // Create a mismatch version for Expected baseline preview
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: system-ui, sans-serif;
              background-color: #18181b;
              color: #f4f4f5;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .card {
              background: #27272a;
              padding: 32px;
              border-radius: 16px;
              border: 2px solid #52525b;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
              text-align: center;
              max-w: 400px;
            }
            .badge {
              background: #22c55e;
              color: #052e16;
              font-weight: bold;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 14px;
            }
            h1 { margin-top: 16px; font-size: 24px; color: #22c55e; }
            p { color: #a1a1aa; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">EXPECTED BASELINE</span>
            <h1>Zen Reporter Original Design</h1>
            <p>Original baseline layout and green theme!</p>
          </div>
        </body>
      </html>
    `);

    const expectedBuffer = await page.screenshot();

    // Attach screenshots conforming to Playwright visual diff naming conventions
    await test.info().attach('card-snapshot-actual.png', {
      body: actualBuffer,
      contentType: 'image/png',
    });

    await test.info().attach('card-snapshot-expected.png', {
      body: expectedBuffer,
      contentType: 'image/png',
    });

    // Assert visual diff failure intentionally
    expect(
      actualBuffer.equals(expectedBuffer),
      'Visual regression mismatch detected! Component layout changed.'
    ).toBe(true);
  }
);
