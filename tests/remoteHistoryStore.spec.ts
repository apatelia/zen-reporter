import { test, expect } from '@playwright/test';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as path from 'path';
import * as fs from 'fs';
import { RemoteHistoryStore } from '../packages/reporter/src/lib/history/RemoteHistoryStore.js';
import type { WriteRunHistoryOptions } from '../packages/reporter/src/lib/runHistoryWriter.js';

interface MockRunDto {
  id: string;
  runName: string;
  projectName: string;
  startedAt: string;
  endedAt: string;
  runDurationMs: number;
  runSequentialDurationMs: number | null;
  runTotal: number;
  runPassed: number;
  runFailed: number;
  runSkipped: number;
  runTimedOut: number;
  runInterrupted: number;
  runWorkers: number | null;
  runProjects: number | null;
  gitBranch: string | null;
  gitCommit: string | null;
  gitCommitFull: string | null;
}

interface MockReportPayload {
  run: MockRunDto;
  testCases: Array<{
    id?: string;
    file: string;
    suite?: string | null;
    title: string;
    project?: string | null;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
    durationMs: number;
    attempts: number;
    failedAttempts: number;
    passedOnRetry: number;
    errorMessage?: string | null;
    errorLine?: number | null;
    errorFile?: string | null;
    tags?: string[];
  }>;
}

test.describe('RemoteHistoryStore Client', () => {
  let serverUrl = process.env.ZEN_SERVER_URL || 'http://localhost:3000';
  const apiKey = process.env.ZEN_REPORTER_API_KEY || 'zr_live_dev_api_key_12345';
  let mockServer: http.Server | null = null;

  test.beforeAll(async () => {
    // If running in CI or if the local service is not reachable, fall back to an in-memory mock server.
    // In local development with running Docker containers, tests connect to the real server on localhost:3000.
    const isLocalServerAvailable = await fetch(`${serverUrl}/health`)
      .then((res) => res.ok)
      .catch(() => false);

    if (process.env.CI || !isLocalServerAvailable) {
      const inMemoryRuns: MockRunDto[] = [];
      const inMemoryReports: Record<string, MockReportPayload> = {};

      mockServer = http.createServer((req, res) => {
        const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;

        if (pathname === '/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        }

        if (pathname.includes('/attachments/presign') && req.method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              uploadUrl: `http://${req.headers.host}/mock-s3-upload`,
              storageKey: 'mock-storage-key-123',
            })
          );
        }

        if (pathname === '/mock-s3-upload' && req.method === 'PUT') {
          res.writeHead(200);
          return res.end();
        }

        if (pathname === '/api/v1/runs' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            const payload = JSON.parse(body);
            const runDto: MockRunDto = {
              id: payload.runId,
              runName: payload.runName,
              projectName: payload.projectName,
              startedAt: payload.startedAt,
              endedAt: payload.endedAt,
              runDurationMs: payload.runDurationMs,
              runSequentialDurationMs: payload.runSequentialDurationMs ?? null,
              runTotal: payload.runTotal,
              runPassed: payload.runPassed,
              runFailed: payload.runFailed,
              runSkipped: payload.runSkipped,
              runTimedOut: payload.runTimedOut,
              runInterrupted: payload.runInterrupted,
              runWorkers: payload.runWorkers ?? null,
              runProjects: payload.runProjects ?? null,
              gitBranch: payload.gitBranch ?? null,
              gitCommit: payload.gitCommit ?? null,
              gitCommitFull: payload.gitCommitFull ?? null,
            };

            inMemoryRuns.push(runDto);

            inMemoryReports[payload.runId] = {
              run: runDto,
              testCases: (payload.testCases || []).map(
                (tc: {
                  id?: string;
                  file: string;
                  suite?: string | null;
                  title: string;
                  project?: string | null;
                  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
                  durationMs: number;
                  attempts: number;
                  failedAttempts: number;
                  passedOnRetry: number;
                  errorMessage?: string | null;
                  errorLine?: number | null;
                  errorFile?: string | null;
                  tags?: string[];
                }) => ({
                  id: tc.id,
                  file: tc.file,
                  suite: tc.suite,
                  title: tc.title,
                  project: tc.project,
                  status: tc.status,
                  durationMs: tc.durationMs,
                  attempts: tc.attempts,
                  failedAttempts: tc.failedAttempts,
                  passedOnRetry: tc.passedOnRetry,
                  errorMessage: tc.errorMessage,
                  errorLine: tc.errorLine,
                  errorFile: tc.errorFile,
                  tags: tc.tags,
                })
              ),
            };

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ runId: payload.runId }));
          });
          return;
        }

        if (pathname === '/api/v1/runs' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ data: inMemoryRuns }));
        }

        if (pathname.startsWith('/api/v1/runs/') && req.method === 'GET') {
          const runId = decodeURIComponent(pathname.replace('/api/v1/runs/', ''));
          const report = inMemoryReports[runId];
          if (!report) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Run not found' }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(report));
        }

        res.writeHead(404);
        res.end();
      });

      await new Promise<void>((resolve) => {
        mockServer!.listen(0, '127.0.0.1', () => {
          const address = mockServer!.address() as AddressInfo;
          serverUrl = `http://127.0.0.1:${address.port}`;
          resolve();
        });
      });
    }
  });

  test.afterAll(async () => {
    if (mockServer) {
      await new Promise<void>((resolve) => mockServer!.close(() => resolve()));
    }
  });

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
