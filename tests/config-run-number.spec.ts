/* eslint-disable no-empty-pattern */
import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { resolveConfig } from '../packages/reporter/src/lib/reporter';

/**
 * Creates a SQLite history database preloaded with the given run names.
 *
 * @param dbPath - Absolute path where the database file is created.
 * @param runNames - Run names inserted into the history_runs table.
 * @returns {void}
 */
function createHistoryDb(dbPath: string, runNames: string[]): void {
  const db = new DatabaseSync(dbPath);
  db.exec(
    'CREATE TABLE history_runs (run_id TEXT PRIMARY KEY, run_name TEXT NOT NULL, started_at TEXT NOT NULL);'
  );
  const insert = db.prepare(
    'INSERT INTO history_runs (run_id, run_name, started_at) VALUES (?, ?, ?);'
  );
  runNames.forEach((name, index) => {
    insert.run(`run-${index + 1}`, name, new Date(Date.now() + index * 1000).toISOString());
  });
  db.close();
}

test.describe('Dynamic {N} Run Numbering & History Probing', () => {
  test('uses run 1 when no history database exists', ({}, testInfo) => {
    const outputDir = testInfo.outputPath('run-number-empty');
    const config = resolveConfig({ outputDir, testRunName: 'Build #{N}' }, process.cwd());
    expect(config.testRunName).toBe('Build #1');
  });

  test('counts runs stored in history.db when the database exists', ({}, testInfo) => {
    const outputDir = testInfo.outputPath('run-number-db');

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      createHistoryDb(path.join(outputDir, 'history.db'), [
        'Smoke 1',
        'Smoke 2',
        'Smoke 3',
        'Smoke 4',
      ]);

      const config = resolveConfig({ outputDir, testRunName: 'Execution #{N}' }, process.cwd());
      expect(config.testRunName).toBe('Execution #5');
    } finally {
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    }
  });

  test('stays strictly monotonic via the highest number embedded in run names', ({}, testInfo) => {
    const outputDir = testInfo.outputPath('run-number-monotonic');

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      // Simulates a pruned history where only a high-numbered run remains.
      createHistoryDb(path.join(outputDir, 'history.db'), ['Execution #135']);

      const config = resolveConfig({ outputDir, testRunName: 'Execution #{N}' }, process.cwd());
      expect(config.testRunName).toBe('Execution #136');
    } finally {
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    }
  });
});
