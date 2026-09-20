import { expect, test } from '@playwright/test';
import { existsSync, readdirSync } from 'fs';
import * as path from 'path';
import { resolveConfig } from '../src/lib/reporter';

/**
 * Cross-run flaky generator for the history tab.
 *
 * Flakiness is computed on final per-run outcomes: a test is flaky if it
 * ended failed/timedOut in some run and passed in another. This test flips
 * its outcome on every run: the number of previously completed runs is the
 * count of JSONL files in <outputDir>/runs/ (each finished run's onEnd
 * writes exactly one). Even count -> pass, odd count -> fail.
 *
 * The body is a pure read — no state is mutated during the test, so both
 * browser projects and both retry attempts observe the same outcome within
 * a run; only the next run sees the flipped result.
 */
test('flaky across runs (alternates pass/fail per run)', () => {
  const runsDir = path.resolve(process.cwd(), resolveConfig().outputDir, 'runs');
  const completed = existsSync(runsDir)
    ? readdirSync(runsDir).filter((f) => f.endsWith('.jsonl')).length
    : 0;

  const shouldFail = completed % 2 === 1;
  expect(shouldFail, `run #${completed + 1}: expected to ${shouldFail ? 'fail' : 'pass'}`).toBe(
    false
  );
});

/**
 * Random flakiness: passes 1/3 of the time, independent per run.
 * Unlike the deterministic alternation above, this gives the history a
 * mixed pass/fail pattern that does not reset on a fixed cadence.
 */
test('flaky random (fails unless the random pick is 1)', () => {
  const valuesToPickFrom = [1, 2, 3];
  const pickIndex = Math.floor(Math.random() * 3);
  const pick = valuesToPickFrom.at(pickIndex);

  expect(pick, `random pick was ${pick}, expected 1`).toBe(1);
});
