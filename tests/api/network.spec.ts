import { expect, test } from '@playwright/test';

test.describe('Network & API Operations', { tag: ['@api', '@network'] }, () => {
  test('browser network route interception and response waiting', async ({ page }) => {
    const apiUrl = 'https://api.example.com/api/v1/user-profile';

    // Intercept API route and fulfill with mock data
    await page.route(apiUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 42,
          username: 'zen-tester',
          role: 'admin',
        }),
      });
    });

    // Wait for explicit network response while initiating browser fetch
    const responsePromise = page.waitForResponse(apiUrl);

    const result = await page.evaluate(async (url) => {
      const res = await fetch(url);
      return res.json();
    }, apiUrl);

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(result.username).toBe('zen-tester');
    expect(result.role).toBe('admin');
  });

  test('browser network POST mutation interception', async ({ page }) => {
    const apiUrl = 'https://api.example.com/api/v1/orders';

    await page.route(apiUrl, async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            orderId: 'ORD-98765',
            item: postData.item,
            quantity: postData.quantity,
            status: 'created',
          }),
        });
      } else {
        await route.continue();
      }
    });

    const responsePromise = page.waitForResponse(apiUrl);

    const result = await page.evaluate(async (url) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: 'Widget Pro', quantity: 3 }),
      });
      return res.json();
    }, apiUrl);

    const response = await responsePromise;
    expect(response.status()).toBe(201);
    expect(result.orderId).toBe('ORD-98765');
    expect(result.status).toBe('created');
  });

  test('direct API request context execution', async ({ request }) => {
    // Public reliable API request
    const response = await request.get('https://catfact.ninja/fact');
    await expect(response).toBeOK();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.fact).toBeDefined();
    expect(typeof body.length).toBe('number');
  });
});
