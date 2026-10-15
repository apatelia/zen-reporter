import { expect, test } from '@playwright/test';

const apiHost = 'https://dogapi.dog/api/v2';

test(
  'get a dog fact',
  {
    tag: ['@animals', '@api', '@dogs'],
  },
  async ({ request }) => {
    const url = apiHost + '/facts';
    const rawResponse = await request.get(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expect(rawResponse).toBeOK();
    expect(rawResponse.status()).toBe(200);

    const response = await rawResponse.json();
    console.log(JSON.stringify(response, null, 2));
    expect(response.data).toHaveLength(1);
  }
);
