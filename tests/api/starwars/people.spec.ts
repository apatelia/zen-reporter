import { expect, test } from '@playwright/test';

const apiHost = 'https://swapi.dev/api';

test(
  'get list of people from Star Wars universe',
  {
    tag: ['@starwars', '@api', '@people'],
  },
  async ({ request }) => {
    const url = apiHost + '/people';
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
  `get specific character's details from Star Wars universe`,
  {
    tag: ['@starwars', '@api', '@people'],
  },
  async ({ request }) => {
    const planetId = 1;
    const url = apiHost + '/people/' + planetId;
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
    expect(response.name).toStrictEqual('Luke Skywalker');
    expect(response.gender).toStrictEqual('male');
    expect(response.eye_color).toStrictEqual('blue');
    expect(response.height).toStrictEqual('172');
  }
);
