import { test } from '@playwright/test';

test(
  'should be interrupted',
  {
    tag: ['@interrupted'],
  },
  // eslint-disable-next-line no-empty-pattern
  async ({}, testInfo) => {
    console.log('Simulating test interruption via testInfo...');
    testInfo.status = 'interrupted';
    throw new Error('Test execution was interrupted');
  }
);
