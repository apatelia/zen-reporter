import { expect, test } from '@playwright/test';

const apiHost = 'https://catfact.ninja';

test(
  'get a cat fact',
  {
    tag: ['@animals', '@api', '@cats'],
  },
  async ({ request }) => {
    const url = apiHost + '/fact';
    const rawResponse = await request.get(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expect(rawResponse).toBeOK();
    expect(rawResponse.status()).toBe(200);

    const response = await rawResponse.json();
    console.log(JSON.stringify(response, null, 2));
    expect(response.fact).toBeDefined();
  }
);
