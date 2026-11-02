/* eslint-disable no-empty-pattern */
import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { migrateJsonlToSqlite } from '../src/lib/history/migration';
import { SqliteHistoryStore } from '../src/lib/history/SqliteHistoryStore';

test.describe('JSONL to SQLite Migration Tests', () => {
  function createSampleJsonl(filePath: string, runId: string, runName: string) {
    const runRow1 = {
      run_id: runId,
      run_name: runName,
      project_name: 'Test Project',
      started_at: '2026-11-01T10:00:00.000Z',
      ended_at: '2026-11-01T10:01:00.000Z',
      run_duration_ms: 60000,
      run_total: 2,
      run_passed: 1,
      run_failed: 1,
      run_skipped: 0,
      run_timed_out: 0,
      run_interrupted: 0,
      file: 'login.spec.ts',
      suite: 'Auth',
      title: 'valid login',
      project: 'chromium',
      status: 'passed',
      duration_ms: 150,
      attempts: 1,
    };

    const runRow2 = {
      ...runRow1,
      title: 'invalid login',
      status: 'failed',
      duration_ms: 220,
      error_message: 'Invalid credentials',
    };

    fs.writeFileSync(filePath, `${JSON.stringify(runRow1)}\n${JSON.stringify(runRow2)}\n`, 'utf8');
  }

  test('migrates multiple JSONL files into SQLite', async ({}, testInfo) => {
    const tempDir = testInfo.outputPath('migration-test');
    const runsDir = path.join(tempDir, 'runs');
    const dbPath = path.join(tempDir, 'history.db');

    fs.mkdirSync(runsDir, { recursive: true });

    createSampleJsonl(path.join(runsDir, 'run-1.jsonl'), 'run-1', 'Build 1');
    createSampleJsonl(path.join(runsDir, 'run-2.jsonl'), 'run-2', 'Build 2');

    const result = await migrateJsonlToSqlite({ runsDir, dbPath });

    expect(result.totalFiles).toBe(2);
    expect(result.migratedRuns).toBe(2);
    expect(result.migratedTestCases).toBe(4);
    expect(result.skippedRuns).toBe(0);

    const store = new SqliteHistoryStore({ dbPath });
    const history = await store.getHistoryData();
    expect(history.runs).toHaveLength(2);
    await store.close();
  });

  test('skips already migrated runs idempotently', async ({}, testInfo) => {
    const tempDir = testInfo.outputPath('idempotency-test');
    const runsDir = path.join(tempDir, 'runs');
    const dbPath = path.join(tempDir, 'history.db');

    fs.mkdirSync(runsDir, { recursive: true });
    createSampleJsonl(path.join(runsDir, 'run-1.jsonl'), 'run-1', 'Build 1');

    // First migration
    const res1 = await migrateJsonlToSqlite({ runsDir, dbPath });
    expect(res1.migratedRuns).toBe(1);

    // Second migration with same files
    const res2 = await migrateJsonlToSqlite({ runsDir, dbPath });
    expect(res2.migratedRuns).toBe(0);
    expect(res2.skippedRuns).toBe(1);

    const store = new SqliteHistoryStore({ dbPath });
    const history = await store.getHistoryData();
    expect(history.runs).toHaveLength(1);
    await store.close();
  });

  test('cleans up source JSONL files when deleteSourceFiles is true', async ({}, testInfo) => {
    const tempDir = testInfo.outputPath('clean-migration-test');
    const runsDir = path.join(tempDir, 'runs');
    const dbPath = path.join(tempDir, 'history.db');

    fs.mkdirSync(runsDir, { recursive: true });
    const file1 = path.join(runsDir, 'run-1.jsonl');
    createSampleJsonl(file1, 'run-1', 'Build 1');

    expect(fs.existsSync(file1)).toBe(true);

    const result = await migrateJsonlToSqlite({
      runsDir,
      dbPath,
      deleteSourceFiles: true,
    });

    expect(result.migratedRuns).toBe(1);
    expect(fs.existsSync(file1)).toBe(false);

    const store = new SqliteHistoryStore({ dbPath });
    const history = await store.getHistoryData();
    expect(history.runs).toHaveLength(1);
    await store.close();
  });

  test('gracefully handles --clean when runs directory is empty or has no .jsonl files', async ({}, testInfo) => {
    const testDir = testInfo.outputPath('clean-empty');
    const runsDir = path.join(testDir, 'runs');
    const dbPath = path.join(testDir, 'history.db');
    fs.mkdirSync(runsDir, { recursive: true });

    // Runs directory has zero files
    const result = await migrateJsonlToSqlite({
      runsDir,
      dbPath,
      deleteSourceFiles: true,
    });

    expect(result.totalFiles).toBe(0);
    expect(result.migratedRuns).toBe(0);
    expect(result.skippedRuns).toBe(0);

    // Non-existent directory should also not throw
    const nonExistentDir = path.join(testDir, 'does-not-exist');
    const resultNonExistent = await migrateJsonlToSqlite({
      runsDir: nonExistentDir,
      dbPath,
      deleteSourceFiles: true,
    });

    expect(resultNonExistent.totalFiles).toBe(0);
    expect(resultNonExistent.migratedRuns).toBe(0);
  });
});
