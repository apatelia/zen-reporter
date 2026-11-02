/* eslint-disable no-empty-pattern */
import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { SqliteHistoryStore } from '../packages/reporter/src/lib/history/SqliteHistoryStore';
import type { ResultSummary, TestCase } from '@arpanp/zen-core';

test.describe('SqliteHistoryStore Tests', () => {
  function getDbPath(testInfo: { outputPath: (file: string) => string }): string {
    return testInfo.outputPath('history.db');
  }

  function createSummary(overrides: Partial<ResultSummary> = {}): ResultSummary {
    return {
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      timedOut: 0,
      startTime: '2026-11-02T20:00:00.000Z',
      endTime: '2026-11-02T20:01:00.000Z',
      duration: 60000,
      numberOfProjects: 1,
      workers: 2,
      ...overrides,
    };
  }

  function createTestCase(overrides: Partial<TestCase> = {}): TestCase {
    return {
      title: 'should execute user login flow',
      parent: 'AuthSuite',
      project: 'chromium',
      fileName: 'auth.spec.ts',
      status: 'passed',
      duration: 150,
      attempts: 1,
      describePath: ['AuthSuite', 'Login'],
      ...overrides,
    };
  }

  test('initializes database and creates schema', async ({}, testInfo) => {
    const dbPath = getDbPath(testInfo);
    const store = new SqliteHistoryStore({ dbPath });
    await store.init();

    expect(fs.existsSync(dbPath)).toBe(true);
    await store.close();
  });

  test('saves execution run and retrieves history data', async ({}, testInfo) => {
    const dbPath = getDbPath(testInfo);
    const store = new SqliteHistoryStore({ dbPath });
    await store.init();

    const summary = createSummary();
    const testCases: TestCase[] = [
      createTestCase({ title: 'test 1', status: 'passed', duration: 120 }),
      createTestCase({
        title: 'test 2',
        status: 'failed',
        duration: 340,
        errors: [
          {
            name: 'AssertionError',
            message: 'Expected true but received false',
            stack: 'Error: stack trace here',
            location: { file: 'auth.spec.ts', line: 42, column: 10 },
            snippet: '',
            cause: null,
          },
        ],
      }),
    ];

    const runId = await store.saveRun({
      startTime: summary.startTime,
      testRunName: 'Build #100',
      projectName: 'Zen Core',
      outputDir: path.dirname(dbPath),
      summary,
      endedAt: summary.endTime,
      testCases,
      stepCategories: { assertions: 5, actions: 10 },
    });

    expect(runId).toContain('build-100');

    const history = await store.getHistoryData();
    expect(history.runs).toHaveLength(1);
    expect(history.runs[0].run_name).toBe('Build #100');
    expect(history.runs[0].run_total).toBe(2);
    expect(history.runs[0].step_categories?.assertions).toBe(5);

    await store.close();
  });

  test('disambiguates duplicate run IDs on collision', async ({}, testInfo) => {
    const dbPath = getDbPath(testInfo);
    const store = new SqliteHistoryStore({ dbPath });
    await store.init();

    const summary = createSummary();
    const runId1 = await store.saveRun({
      startTime: summary.startTime,
      testRunName: 'Nightly',
      projectName: 'Zen Core',
      outputDir: path.dirname(dbPath),
      summary,
      endedAt: summary.endTime,
      testCases: [],
    });

    const runId2 = await store.saveRun({
      startTime: summary.startTime,
      testRunName: 'Nightly',
      projectName: 'Zen Core',
      outputDir: path.dirname(dbPath),
      summary,
      endedAt: summary.endTime,
      testCases: [],
    });

    expect(runId1).not.toBe(runId2);
    expect(runId2).toBe(`${runId1}-2`);

    await store.close();
  });

  test('enforces retention policy with maxRuns pruning', async ({}, testInfo) => {
    const dbPath = getDbPath(testInfo);
    const store = new SqliteHistoryStore({ dbPath, maxRuns: 2 });
    await store.init();

    for (let i = 1; i <= 3; i++) {
      const summary = createSummary({
        startTime: `2026-11-0${i}T10:00:00.000Z`,
        endTime: `2026-11-0${i}T10:01:00.000Z`,
      });

      await store.saveRun({
        startTime: summary.startTime,
        testRunName: `Run #${i}`,
        projectName: 'Zen Core',
        outputDir: path.dirname(dbPath),
        summary,
        endedAt: summary.endTime,
        testCases: [],
      });
    }

    const history = await store.getHistoryData();
    expect(history.runs).toHaveLength(2);
    // Oldest run (#1) pruned, remaining are #2 and #3
    const runNames = history.runs.map((r) => r.run_name);
    expect(runNames).toContain('Run #2');
    expect(runNames).toContain('Run #3');
    expect(runNames).not.toContain('Run #1');

    await store.close();
  });
});
