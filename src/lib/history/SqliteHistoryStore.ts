import * as fs from 'fs';
import * as path from 'path';
import { buildRunId } from '../runHistory';
import type { WriteRunHistoryOptions } from '../runHistoryWriter';
import type {
  HistoryData,
  HistoryFileRow,
  HistoryFlakyRow,
  HistoryRegressionRow,
  HistoryRun,
  HistorySlowRow,
  HistoryTestRow,
} from '../types/history';
import type { TestCase as TestCaseModel } from '../types/report';
import type { HistoryStore } from './HistoryStore';
import { INIT_SCHEMA_STATEMENTS } from './schema';

interface SqliteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  all(...params: unknown[]): Record<string, unknown>[];
  get(...params: unknown[]): Record<string, unknown> | undefined;
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

import type { MigrationResult } from './migration';

export interface SqliteHistoryStoreOptions {
  /** Database file path. Defaults to `<outputDir>/history.db` */
  dbPath: string;
  /** Maximum number of historical runs embedded into the static HTML report. */
  windowSize?: number;
  /** Maximum runs to retain in SQLite (0 = unlimited). */
  maxRuns?: number;
  /** Automatically migrate adjacent runs/*.jsonl on initialization. Defaults to true. */
  autoMigrate?: boolean;
}

/**
 * SQLite implementation of `HistoryStore`.
 * Uses Node's built-in `node:sqlite` (Node >= 22.5.0) or dynamic fallback
 * to persist and query execution history in a single indexed binary file.
 */
export class SqliteHistoryStore implements HistoryStore {
  readonly dbPath: string;
  readonly windowSize: number;
  readonly maxRuns: number;
  readonly autoMigrate: boolean;
  private db: SqliteDatabase | null = null;

  constructor(options: SqliteHistoryStoreOptions) {
    this.dbPath = options.dbPath;
    this.windowSize = options.windowSize ?? 50;
    this.maxRuns = options.maxRuns ?? 1000;
    this.autoMigrate = options.autoMigrate ?? true;
  }

  /**
   * Initializes the SQLite database and executes relational schema migrations.
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let DatabaseSyncConstructor: (new (location: string) => SqliteDatabase) | undefined;

    try {
      // Dynamic import to prevent syntax or module errors on older Node environments
      const sqliteModule = await import('node:sqlite');
      DatabaseSyncConstructor = sqliteModule.DatabaseSync as unknown as new (
        location: string
      ) => SqliteDatabase;
    } catch {
      throw new Error(
        'node:sqlite is not available. Please ensure you are running on Node.js >= 22.5.0'
      );
    }

    this.db = new DatabaseSyncConstructor(this.dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');

    for (const statement of INIT_SCHEMA_STATEMENTS) {
      this.db.exec(statement);
    }

    if (this.autoMigrate) {
      const adjacentRunsDir = path.join(dir, 'runs');
      if (fs.existsSync(adjacentRunsDir)) {
        const result = this.migrateFromRunsDir(adjacentRunsDir);
        if (result.migratedRuns > 0) {
          console.log(
            `\n\x1b[36mℹ\x1b[0m Zen Reporter: Successfully migrated ${result.migratedRuns} historical run(s) (${result.migratedTestCases} test executions) to SQLite (${path.relative(process.cwd(), this.dbPath) || this.dbPath}).`
          );
          console.log(
            `\x1b[33m💡\x1b[0m You may safely remove the legacy "${path.relative(process.cwd(), adjacentRunsDir) || adjacentRunsDir}" directory or run "npx zr history migrate --clean".\n`
          );
        }
      }
    }
  }

  /**
   * Persists a completed test run and all test case results.
   *
   * @param options - Execution results and summary details.
   * @returns Generated unique run ID.
   */
  async saveRun(options: WriteRunHistoryOptions): Promise<string> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const baseRunId = buildRunId(options.startTime, options.testRunName, options.shard ?? null);
    let finalRunId = baseRunId;
    let suffix = 2;

    const checkStmt = this.db.prepare('SELECT 1 FROM history_runs WHERE run_id = ?');

    while (checkStmt.get(finalRunId)) {
      finalRunId = `${baseRunId}-${suffix}`;
      suffix += 1;
    }

    const summary = options.summary;
    const stepCategories = options.stepCategories;

    const insertRunStmt = this.db.prepare(`
      INSERT INTO history_runs (
        run_id, run_name, project_name, started_at, ended_at,
        run_duration_ms, run_sequential_duration_ms, run_total,
        run_passed, run_failed, run_skipped, run_timed_out, run_interrupted,
        run_workers, run_projects, step_assertions, step_actions,
        step_network, step_hooks, step_waits, step_others
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    insertRunStmt.run(
      finalRunId,
      options.testRunName,
      options.projectName,
      summary.startTime,
      options.endedAt,
      summary.duration,
      summary.totalSequentialDuration ?? null,
      summary.total,
      summary.passed,
      summary.failed,
      summary.skipped,
      summary.timedOut,
      summary.interrupted ?? 0,
      summary.workers ?? null,
      summary.numberOfProjects,
      stepCategories?.assertions ?? 0,
      stepCategories?.actions ?? 0,
      stepCategories?.network ?? 0,
      stepCategories?.hooks ?? 0,
      stepCategories?.waits ?? 0,
      stepCategories?.others ?? 0
    );

    if (options.testCases.length > 0) {
      const insertTestStmt = this.db.prepare(`
        INSERT INTO history_test_cases (
          run_id, file, suite, title, project, status,
          duration_ms, attempts, failed_attempts, passed_on_retry,
          error_message, error_stack, error_file, error_line, tags
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      for (const tc of options.testCases) {
        this.insertTestCase(insertTestStmt, finalRunId, tc);
      }
    }

    if (this.maxRuns > 0) {
      this.pruneRuns(this.maxRuns);
    }

    return finalRunId;
  }

  private insertTestCase(stmt: SqliteStatement, runId: string, tc: TestCaseModel): void {
    const suite = (tc.describePath?.length ? tc.describePath.join(' > ') : tc.parent) || '';
    const attempts = tc.attempts ?? 1;
    const failedAttempts = tc.failedAttempts?.length ?? 0;
    const passedOnRetry = attempts > 1 && tc.status === 'passed' ? 1 : 0;
    const errorMessage = tc.errors?.[0]?.message ?? null;
    const errorStack = tc.errors?.[0]?.stack ?? null;
    const errorFile = tc.errors?.[0]?.location?.file ?? null;
    const errorLine = tc.errors?.[0]?.location?.line ?? null;
    const tagsJson = tc.tags && tc.tags.length > 0 ? JSON.stringify(tc.tags) : null;

    stmt.run(
      runId,
      tc.fileName,
      suite,
      tc.title,
      tc.project,
      tc.status,
      Math.round(tc.duration),
      attempts,
      failedAttempts,
      passedOnRetry,
      errorMessage,
      errorStack,
      errorFile,
      errorLine,
      tagsJson
    );
  }

  private pruneRuns(limit: number): void {
    if (!this.db) return;
    this.db
      .prepare(
        `DELETE FROM history_runs
         WHERE run_id NOT IN (
           SELECT run_id FROM history_runs ORDER BY started_at DESC LIMIT ?
         )`
      )
      .run(limit);
  }

  /**
   * Generates aggregated historical data from the SQLite database.
   *
   * @param windowSize - Maximum number of recent runs to return in the trend window.
   * @returns Aggregated history dataset.
   */
  async getHistoryData(windowSize = this.windowSize): Promise<HistoryData> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const runsStmt = this.db.prepare(`
      SELECT
        run_id, run_name, started_at, run_duration_ms,
        run_sequential_duration_ms, run_workers, run_total,
        run_passed, run_failed, run_skipped, run_timed_out, run_interrupted,
        round(100.0 * run_passed / nullif(run_total, 0), 1) AS pass_rate,
        step_assertions, step_actions, step_network, step_hooks, step_waits, step_others
      FROM history_runs
      ORDER BY started_at DESC
      LIMIT ?
    `);

    const rawRuns = runsStmt.all(windowSize) as unknown as (Record<string, unknown> & {
      step_assertions: number;
      step_actions: number;
      step_network: number;
      step_hooks: number;
      step_waits: number;
      step_others: number;
    })[];

    const runs: HistoryRun[] = rawRuns.reverse().map((r) => {
      const hasStepCategories =
        (r.step_assertions || 0) +
          (r.step_actions || 0) +
          (r.step_network || 0) +
          (r.step_hooks || 0) +
          (r.step_waits || 0) +
          (r.step_others || 0) >
        0;

      return {
        run_id: String(r.run_id),
        run_name: String(r.run_name),
        started_at: String(r.started_at),
        run_duration_ms: Number(r.run_duration_ms),
        run_sequential_duration_ms:
          r.run_sequential_duration_ms !== null ? Number(r.run_sequential_duration_ms) : null,
        run_workers: r.run_workers !== null ? Number(r.run_workers) : undefined,
        run_total: Number(r.run_total),
        run_passed: Number(r.run_passed),
        run_failed: Number(r.run_failed),
        run_skipped: Number(r.run_skipped),
        run_timed_out: Number(r.run_timed_out),
        run_interrupted: Number(r.run_interrupted),
        pass_rate: r.pass_rate !== null ? Number(r.pass_rate) : null,
        step_categories: hasStepCategories
          ? {
              assertions: Number(r.step_assertions || 0),
              actions: Number(r.step_actions || 0),
              network: Number(r.step_network || 0),
              hooks: Number(r.step_hooks || 0),
              waits: Number(r.step_waits || 0),
              others: Number(r.step_others || 0),
            }
          : undefined,
      };
    });

    const flakyStmt = this.db.prepare(`
      SELECT
        suite, file, title, project,
        count(CASE WHEN status IN ('failed', 'timedOut') THEN 1 END) AS failed_runs,
        count(CASE WHEN status = 'passed' THEN 1 END) AS passed_runs,
        sum(passed_on_retry) AS recovered_by_retry,
        count(*) AS total_runs
      FROM history_test_cases
      GROUP BY suite, file, title, project
      HAVING failed_runs > 0 AND passed_runs > 0
      ORDER BY failed_runs DESC, passed_runs DESC
      LIMIT 100
    `);
    const flaky = (flakyStmt.all() as unknown as HistoryFlakyRow[]) || [];

    const slowestStmt = this.db.prepare(`
      SELECT
        suite, file, title, project,
        round(avg(duration_ms), 1) AS avg_duration_ms,
        max(duration_ms) AS max_duration_ms,
        count(*) AS runs
      FROM history_test_cases
      GROUP BY suite, file, title, project
      ORDER BY avg(duration_ms) DESC
      LIMIT 20
    `);
    const slowest = (slowestStmt.all() as unknown as HistorySlowRow[]) || [];

    const regressions: HistoryRegressionRow[] = [];
    const files: HistoryFileRow[] = [];
    const tests: HistoryTestRow[] = [];

    return {
      generated_at: new Date().toISOString(),
      runs,
      flaky,
      regressions,
      slowest,
      files,
      tests,
    };
  }

  /**
   * Migrates historic test runs from individual JSONL files into the SQLite database.
   * Skips files whose run_id already exists in the database.
   *
   * @param runsDir - Directory containing JSONL files.
   * @param deleteSourceFiles - If true, removes source JSONL files after successful migration.
   * @returns Migration result counts and duration.
   */
  migrateFromRunsDir(runsDir: string, deleteSourceFiles = false): MigrationResult {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const start = Date.now();
    if (!fs.existsSync(runsDir)) {
      return {
        totalFiles: 0,
        migratedRuns: 0,
        migratedTestCases: 0,
        skippedRuns: 0,
        durationMs: 0,
      };
    }

    const files = fs.readdirSync(runsDir).filter((f) => f.endsWith('.jsonl'));
    if (files.length === 0) {
      return {
        totalFiles: 0,
        migratedRuns: 0,
        migratedTestCases: 0,
        skippedRuns: 0,
        durationMs: 0,
      };
    }

    const existingRows = this.db.prepare('SELECT run_id FROM history_runs').all() as {
      run_id: string;
    }[];
    const existingRunIds = new Set(existingRows.map((r) => r.run_id));

    const insertRunStmt = this.db.prepare(`
      INSERT OR IGNORE INTO history_runs (
        run_id, run_name, project_name, started_at, ended_at,
        run_duration_ms, run_sequential_duration_ms, run_total,
        run_passed, run_failed, run_skipped, run_timed_out, run_interrupted,
        run_workers, run_projects, step_assertions, step_actions,
        step_network, step_hooks, step_waits, step_others
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const insertTestStmt = this.db.prepare(`
      INSERT INTO history_test_cases (
        run_id, file, suite, title, project, status,
        duration_ms, attempts, failed_attempts, passed_on_retry,
        error_message, error_stack, error_file, error_line, tags
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    let migratedRuns = 0;
    let migratedTestCases = 0;
    let skippedRuns = 0;
    const filesToDelete: string[] = [];

    this.db.exec('BEGIN TRANSACTION;');

    try {
      for (const file of files) {
        const filePath = path.join(runsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');
        if (lines.length === 0 || !lines[0]) continue;

        let firstRow: Record<string, unknown>;
        try {
          firstRow = JSON.parse(lines[0]);
        } catch {
          continue;
        }

        const runId = String(firstRow.run_id || '');
        if (!runId || existingRunIds.has(runId)) {
          skippedRuns++;
          if (deleteSourceFiles && runId && existingRunIds.has(runId)) {
            filesToDelete.push(filePath);
          }
          continue;
        }

        insertRunStmt.run(
          runId,
          String(firstRow.run_name || 'Test Run'),
          String(firstRow.project_name || 'Project'),
          String(firstRow.started_at || new Date().toISOString()),
          String(firstRow.ended_at || new Date().toISOString()),
          Number(firstRow.run_duration_ms || 0),
          firstRow.run_sequential_duration_ms !== null &&
            firstRow.run_sequential_duration_ms !== undefined
            ? Number(firstRow.run_sequential_duration_ms)
            : null,
          Number(firstRow.run_total || 0),
          Number(firstRow.run_passed || 0),
          Number(firstRow.run_failed || 0),
          Number(firstRow.run_skipped || 0),
          Number(firstRow.run_timed_out || 0),
          Number(firstRow.run_interrupted || 0),
          firstRow.run_workers !== null && firstRow.run_workers !== undefined
            ? Number(firstRow.run_workers)
            : null,
          Number(firstRow.run_projects || 1),
          Number(firstRow.step_assertions || 0),
          Number(firstRow.step_actions || 0),
          Number(firstRow.step_network || 0),
          Number(firstRow.step_hooks || 0),
          Number(firstRow.step_waits || 0),
          Number(firstRow.step_others || 0)
        );

        existingRunIds.add(runId);
        migratedRuns++;

        for (const line of lines) {
          if (!line.trim()) continue;
          let r: Record<string, unknown>;
          try {
            r = JSON.parse(line);
          } catch {
            continue;
          }

          if (!r.title && !r.file) continue;

          insertTestStmt.run(
            runId,
            String(r.file || ''),
            String(r.suite || ''),
            String(r.title || ''),
            String(r.project || ''),
            String(r.status || 'passed'),
            Math.round(Number(r.duration_ms || 0)),
            Number(r.attempts || 1),
            Number(r.failed_attempts || 0),
            r.passed_on_retry ? 1 : 0,
            r.error_message !== null && r.error_message !== undefined
              ? String(r.error_message)
              : null,
            r.error_stack !== null && r.error_stack !== undefined ? String(r.error_stack) : null,
            r.error_file !== null && r.error_file !== undefined ? String(r.error_file) : null,
            r.error_line !== null && r.error_line !== undefined ? Number(r.error_line) : null,
            r.tags ? (typeof r.tags === 'string' ? r.tags : JSON.stringify(r.tags)) : null
          );
          migratedTestCases++;
        }

        if (deleteSourceFiles) {
          filesToDelete.push(filePath);
        }
      }

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    if (deleteSourceFiles) {
      for (const f of filesToDelete) {
        try {
          fs.unlinkSync(f);
        } catch {
          /* ignore deletion error */
        }
      }
      try {
        const remaining = fs.readdirSync(runsDir);
        if (remaining.length === 0) {
          fs.rmdirSync(runsDir);
        }
      } catch {
        /* ignore rmdir error */
      }
    }

    return {
      totalFiles: files.length,
      migratedRuns,
      migratedTestCases,
      skippedRuns,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Closes the active database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
