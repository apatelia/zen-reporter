import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import { resolveConfig } from '../src/lib/reporter';

const counterDir = path.resolve(process.cwd(), resolveConfig().outputDir);
const counterFile = path.join(counterDir, '_retry_counter');

test.describe.configure({ retries: 1 });

test('flaky once (fails on first attempt, passes on retry)', () => {
  const n = existsSync(counterFile) ? Number(readFileSync(counterFile, 'utf8')) : 0;

  if (n === 0) {
    if (!existsSync(counterDir)) {
      mkdirSync(counterDir, { recursive: true });
    }
    writeFileSync(counterFile, '1');
    expect(1, 'first attempt should fail').toBe(2);
  }

  expect(1).toBe(1);

  // Remove counter file after the test passes on retry.
  rmSync(counterFile);
});
