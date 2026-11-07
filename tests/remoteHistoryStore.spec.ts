import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { RemoteHistoryStore } from '../packages/reporter/src/lib/history/RemoteHistoryStore.js';
import type { WriteRunHistoryOptions } from '../packages/reporter/src/lib/runHistoryWriter.js';

test.describe('RemoteHistoryStore Client', () => {
  const serverUrl = 'http://localhost:3000';
  const apiKey = 'zr_live_dev_api_key_12345';

  test('uploads run and queries history from backend server', async () => {
    // 1. Verify health
    const store = new RemoteHistoryStore({
      mode: 'remote',
      serverUrl,
      apiKey,
      projectId: 'Playwright E2E Suite',
    });

    await store.init();

    // 2. Prepare test attachment
    const testOutputDir = path.resolve('test-results/remote-store-spec');
    fs.mkdirSync(testOutputDir, { recursive: true });
    const dummyScreenshot = path.join(testOutputDir, 'remote-screen.png');
    fs.writeFileSync(dummyScreenshot, 'dummy png content');

    const runOptions: WriteRunHistoryOptions = {
      startTime: '2026-11-04T17:00:00.000Z',
      endedAt: '2026-11-04T17:01:00.000Z',
      testRunName: 'Remote Client Test Run',
      projectName: 'Playwright E2E Suite',
      outputDir: testOutputDir,
      summary: {
        total: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        interrupted: 0,
        duration: 60000,
        totalSequentialDuration: 60000,
        startTime: '2026-11-04T17:00:00.000Z',
        endTime: '2026-11-04T17:01:00.000Z',
        workers: 1,
        numberOfProjects: 1,
      },
      testCases: [
        {
          fileName: 'tests/remote.spec.ts',
          parent: 'Remote Suite',
          title: 'verifies client remote persistence',
          project: 'chromium',
          status: 'passed',
          duration: 1200,
          steps: [
            {
              title: 'ping remote server',
              duration: 50,
              status: 'passed',
              annotations: [],
              attachments: [],
              error: null,
            },
          ],
          stdout: ['Remote ping ok'],
          attachments: [
            {
              name: 'screenshot',
              contentType: 'image/png',
              path: dummyScreenshot,
            },
          ],
        },
      ],
    };

    const savedRunId = await store.saveRun(runOptions);
    expect(savedRunId).toBeTruthy();

    // 3. Query history data
    const historyData = await store.getHistoryData(10);
    expect(historyData.runs.length).toBeGreaterThan(0);
    const foundRun = historyData.runs.find((r) => r.run_id === savedRunId);
    expect(foundRun).toBeTruthy();
    expect(foundRun?.run_name).toBe('Remote Client Test Run');

    // 4. Query full run report
    const reportData = await store.getRunReport(savedRunId);
    expect(reportData).toBeTruthy();
    expect(reportData?.testRun.testRunName).toBe('Remote Client Test Run');
    expect(reportData?.testRun.summary.total).toBe(1);

    await store.close();
  });
});
