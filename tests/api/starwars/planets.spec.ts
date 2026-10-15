import { expect, test } from '@playwright/test';

const apiHost = 'https://swapi.dev/api';

test(
  'get list of planets from Star Wars universe',
  {
    tag: ['@starwars', '@api', '@planets'],
  },
  async ({ request }) => {
    const url = apiHost + '/planets';
    const rawResponse = await request.get(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expect(rawResponse).toBeOK();
    expect(rawResponse.status()).toBe(200);

    const response = await rawResponse.json();
    expect(response.results.length).toBeGreaterThan(0);
  }
);

test(
  'get specific planet details from Star Wars universe',
  {
    tag: ['@starwars', '@api', '@planets'],
  },
  async ({ request }) => {
    const planetId = 1;
    const url = apiHost + '/planets/' + planetId;
    const rawResponse = await request.get(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expect(rawResponse).toBeOK();
    expect(rawResponse.status()).toBe(200);

    const response = await rawResponse.json();
    console.log(JSON.stringify(response, null, 2));
    expect(response).toBeDefined();
    expect(response.name).toStrictEqual('Tatooine');
    expect(response.terrain).toStrictEqual('desert');
    expect(response.climate).toStrictEqual('arid');
  }
);
