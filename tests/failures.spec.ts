import { expect, test } from '@playwright/test';

test.fail(
  'should fail',
  {
    tag: ['@failure'],
  },
  async () => {
    console.log('This test should fail');
    expect(true).toBe(true);
    console.error('True can never be False');
    expect(true).toBe(false);
  }
);

test.fixme(
  'to be fixed',
  {
    tag: ['@fixme'],
  },
  async () => {
    console.debug('empty test');
    await test.step('empty step - this step needs to be fixed', async () => {});
  }
);

test.skip(
  'Skipped test',
  {
    tag: ['@skip'],
  },
  async () => {
    console.debug('skipped test');
    await test.step('this step will be skipped', async () => {});
  }
);

test.fail(
  'should time out',
  {
    tag: ['@timeout'],
  },
  async () => {
    console.debug('timed out test');
    await test.step('timed out', async () => {
      await new Promise((resolve) => setTimeout(resolve, 32_000));
    });
  }
);
