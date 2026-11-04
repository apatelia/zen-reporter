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

  test('saves attachments and prunes attachment files from disk on retention limit', async ({}, testInfo) => {
    const tempDir = testInfo.outputPath('att-test');
    const dbPath = path.join(tempDir, 'history.db');
    const attDir = path.join(tempDir, 'attachments');
    fs.mkdirSync(attDir, { recursive: true });

    const store = new SqliteHistoryStore({ dbPath, maxRuns: 2 });
    await store.init();

    // Create 3 runs, each with a dummy attachment file
    for (let i = 1; i <= 3; i++) {
      const attFileName = `run_${i}_screen.png`;
      const attFilePath = path.join(attDir, attFileName);
      fs.writeFileSync(attFilePath, `dummy-image-data-run-${i}`);

      const summary = createSummary({
        startTime: `2026-11-0${i}T12:00:00.000Z`,
        endTime: `2026-11-0${i}T12:01:00.000Z`,
      });

      const tc = createTestCase({
        title: `test in run ${i}`,
        attachments: [
          {
            name: `screenshot-${i}`,
            contentType: 'image/png',
            path: `./attachments/${attFileName}`,
          },
        ],
      });

      await store.saveRun({
        startTime: summary.startTime,
        testRunName: `Run #${i}`,
        projectName: 'Attachment Project',
        outputDir: tempDir,
        summary,
        endedAt: summary.endTime,
        testCases: [tc],
      });
    }

    // Since maxRuns is 2, Run #1 should be pruned, and run_1_screen.png unlinked
    const run1AttPath = path.join(attDir, 'run_1_screen.png');
    const run2AttPath = path.join(attDir, 'run_2_screen.png');
    const run3AttPath = path.join(attDir, 'run_3_screen.png');

    expect(fs.existsSync(run1AttPath)).toBe(false);
    expect(fs.existsSync(run2AttPath)).toBe(true);
    expect(fs.existsSync(run3AttPath)).toBe(true);

    await store.close();
  });

  test('reconstructs ReportData for a historical run with getRunReport', async ({}, testInfo) => {
    const tempDir = testInfo.outputPath('rehydrate-test');
    const dbPath = path.join(tempDir, 'history.db');
    const store = new SqliteHistoryStore({ dbPath });
    await store.init();

    const summary = createSummary({
      startTime: '2026-11-03T15:00:00.000Z',
      endTime: '2026-11-03T15:01:30.000Z',
      duration: 90000,
    });

    const tc = createTestCase({
      title: 'checkout payment',
      describePath: ['Checkout', 'Payment'],
      status: 'failed',
      duration: 540,
      errors: [
        {
          name: 'PaymentError',
          message: 'Insufficient balance',
          stack: 'PaymentError: Insufficient balance\n at checkout.spec.ts:42',
          location: { file: 'checkout.spec.ts', line: 42, column: 5 },
          snippet: 'await pay()',
          cause: null,
        },
      ],
      attachments: [
        {
          name: 'receipt',
          contentType: 'application/json',
          path: './attachments/receipt.json',
          body: '{"status":"declined"}',
        },
      ],
      steps: [
        {
          title: 'Fill card details',
          duration: 120,
          status: 'passed',
          annotations: [],
          attachments: [],
          error: null,
        },
      ],
      stdout: ['Initiating card authorization...'],
      stderr: ['Declined code 51'],
    });

    const runId = await store.saveRun({
      startTime: summary.startTime,
      testRunName: 'Payment Run #1',
      projectName: 'E-Commerce',
      outputDir: tempDir,
      summary,
      endedAt: summary.endTime,
      testCases: [tc],
    });

    const reportData = await store.getRunReport(runId);
    expect(reportData).not.toBeNull();
    expect(reportData?.testRun.testRunName).toBe('Payment Run #1');
    expect(reportData?.testRun.projectName).toBe('E-Commerce');
    expect(reportData?.testRun.summary.failed).toBe(1);

    const testCase = reportData?.testRun.suites[0].subSuites?.[0].subSuites?.[0].cases[0];
    expect(testCase?.title).toBe('checkout payment');
    expect(testCase?.status).toBe('failed');
    expect(testCase?.errors?.[0].message).toBe('Insufficient balance');
    expect(testCase?.attachments?.[0].name).toBe('receipt');
    expect(testCase?.attachments?.[0].body).toBe('{"status":"declined"}');
    expect(testCase?.steps).toHaveLength(1);
    expect(testCase?.steps?.[0].title).toBe('Fill card details');
    expect(testCase?.stdout?.[0]).toBe('Initiating card authorization...');
    expect(testCase?.stderr?.[0]).toBe('Declined code 51');

    const notFound = await store.getRunReport('non-existent-run');
    expect(notFound).toBeNull();

    await store.close();
  });
});
