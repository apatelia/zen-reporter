import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { getOsName, getPlaywrightVersion } from '../../bin/commands/system.js';
import { processAttachments } from './attachmentManager';
import {
  convertPlaywrightSteps,
  normalizeTheme,
  parseDarkMode,
  sanitizeAnsi,
  setFsModule,
} from '@arpanp/zen-core';
import { generateTerminalSummaryTable } from '@arpanp/zen-core';
import { detectPackageManager } from './dataProcessor';
import { getGitBranch, getGitCommit } from './gitUtils';
import { generateHtmlReport } from './htmlReportGenerator';
import { ProgressPrinter, type ProgressMode, type TestStatus } from './progressPrinter';
import { writeRunHistory } from './runHistoryWriter';
import { buildSuitesFromCases } from '@arpanp/zen-core';
import { countStepCategories } from '@arpanp/zen-core';
import type {
  DisabledHistoryConfig,
  HistoryConfig,
  LocalHistoryConfig,
  RemoteHistoryConfig,
} from '@arpanp/zen-core';
import type {
  ReportData,
  ResultSummary,
  TestCase as TestCaseModel,
  TestError,
  TestRun as TestRunModel,
  TestSuite,
} from '@arpanp/zen-core';

setFsModule(fs);

/**
 * Traverses parent suites to build a describe path array for a test case.
 *
 * @param test - Playwright TestCase object.
 * @returns Array of describe suite titles leading up to the test case.
 */
function getDescribePath(test: TestCase): string[] {
  const describePath: string[] = [];
  let curr: Suite | undefined = test.parent;

  while (curr) {
    if (curr.type === 'file' || curr.type === 'project' || curr.type === 'root') {
      break;
    }
    if (curr.type === 'describe' && curr.title) {
      describePath.unshift(curr.title);
    }
    curr = curr.parent;
  }

  return describePath;
}

/**
 * Loads the optional `zen.config.json` file from the given directory, if present.
 *
 * @param configDir - Directory containing the Playwright configuration file.
 * @returns The parsed options object, or `null` when no `zen.config.json` exists.
 * @throws {Error} When `zen.config.json` exists but contains invalid JSON or is not a plain object.
 */
function loadZenConfigFile(configDir: string): Record<string, unknown> | null {
  const filePath = path.join(configDir, 'zen.config.json');

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw new Error(
      `Zen Reporter: failed to read ${filePath}. Fix or remove the file; its options are not used silently. ` +
        `Cause: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Zen Reporter: failed to parse ${filePath} as JSON. Fix or remove the file; its options are not used silently. ` +
        `Cause: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `Zen Reporter: ${filePath} must contain a plain object of reporter options (e.g. { "projectName": "My Project" }).`
    );
  }

  return parsed as Record<string, unknown>;
}

export interface ReporterConfig {
  outputDir: string;
  packageManager: string;
  projectName: string;
  testRunName: string;
  singleSummaryFile?: boolean;
  theme?: string;
  darkMode: 'system' | 'light' | 'dark';
  enableHistory: 'auto' | boolean;
  history?: HistoryConfig;
  minimalReport?: boolean;
  consoleProgress: 'auto' | 'line' | 'dot' | boolean;
  openAutomatically: 'always' | 'never' | 'on-failure-only';
}

/**
 * Resolves user options and defaults into a complete `ReporterConfig` object.
 *
 * @param inlineConfig - Options passed inline in the Playwright reporter tuple.
 * @param cwd - Current working directory (defaults to process.cwd()).
 * @param configDir - Directory of the Playwright config file; probed for `zen.config.json` (defaults to no discovery).
 * @returns Fully resolved reporter configuration.
 */
export function resolveConfig(
  inlineConfig?: Record<string, unknown>,
  cwd: string = process.cwd(),
  configDir?: string
): ReporterConfig {
  const rawConfig: Record<string, unknown> = {
    ...(configDir ? loadZenConfigFile(configDir) : {}),
    ...inlineConfig,
  };
  const outputDir = rawConfig?.outputDir ? String(rawConfig.outputDir) : 'zen-report';
  const packageManager = detectPackageManager(cwd);
  const projectName = rawConfig?.projectName
    ? String(rawConfig.projectName)
    : 'Test Automation Project';
  let runNumber = 1;

  try {
    const dbPath =
      typeof rawConfig?.history === 'object' &&
      rawConfig.history !== null &&
      'dbPath' in rawConfig.history &&
      rawConfig.history.dbPath
        ? path.resolve(cwd, String(rawConfig.history.dbPath))
        : path.resolve(cwd, outputDir, 'history.db');

    let countedFromDb = false;

    if (fs.existsSync(dbPath)) {
      try {
        const req = createRequire(import.meta.url);
        const sqlite = req('node:sqlite');
        if (sqlite && typeof sqlite.DatabaseSync === 'function') {
          const db = new sqlite.DatabaseSync(dbPath, { open: true, readOnly: true });
          try {
            const countRow = db.prepare('SELECT COUNT(*) as count FROM history_runs').get() as
              { count: number } | undefined;
            const totalCount = countRow && typeof countRow.count === 'number' ? countRow.count : 0;

            let maxNumberFound = 0;

            // Find the maximum existing run number embedded in run_name (e.g., "#135" or "Run 135")
            // so numbers remain strictly monotonic even after pruning/deleting older runs.
            // Safely verify if run_name column exists (in case table was created with custom/minimal schema).
            try {
              const recentRuns = db
                .prepare(
                  'SELECT run_name FROM history_runs WHERE run_name IS NOT NULL ORDER BY started_at DESC LIMIT 100'
                )
                .all() as { run_name: string }[];

              for (const item of recentRuns) {
                if (!item.run_name) continue;
                const match = item.run_name.match(/#(\d+)\b/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (!isNaN(num) && num > maxNumberFound) {
                    maxNumberFound = num;
                  }
                }
              }
            } catch {
              /* ignore missing columns if custom schema */
            }

            if (maxNumberFound > 0) {
              runNumber = maxNumberFound + 1;
              countedFromDb = true;
            } else if (totalCount > 0) {
              runNumber = totalCount + 1;
              countedFromDb = true;
            }
          } finally {
            db.close();
          }
        }
      } catch {
        /* fallback to file system / legacy checks */
      }
    }

    if (!countedFromDb) {
      const runsDir = path.resolve(cwd, outputDir, 'runs');
      if (fs.existsSync(runsDir)) {
        const files = fs.readdirSync(runsDir);
        const runFiles = files.filter((f) => f.endsWith('.jsonl'));
        runNumber = runFiles.length + 1;
      }
    }
  } catch {
    runNumber = 1;
  }

  const rawTestRunName = rawConfig?.testRunName ? String(rawConfig.testRunName) : 'Test Run #{N}';
  const testRunName = rawTestRunName.replaceAll('{N}', String(runNumber));
  const singleSummaryFile = Boolean(rawConfig?.singleSummaryFile);
  const theme =
    normalizeTheme(rawConfig?.theme != null ? String(rawConfig.theme) : undefined) ?? 'Sage';
  const darkMode = parseDarkMode(rawConfig?.darkMode);
  const minimalReport = Boolean(rawConfig?.minimalReport);

  let enableHistory: 'auto' | boolean = 'auto';
  let history: HistoryConfig | undefined = undefined;

  if (rawConfig?.history !== undefined) {
    history = rawConfig.history as HistoryConfig;
    if (
      history === false ||
      (typeof history === 'object' && history !== null && history.mode === 'off')
    ) {
      enableHistory = false;
    } else if (history === true) {
      enableHistory = true;
    } else if (
      typeof history === 'object' &&
      history !== null &&
      (history.mode === 'local' || history.mode === 'remote')
    ) {
      enableHistory = true;
    }
  }

  if (minimalReport) {
    enableHistory = false;
  } else if (rawConfig?.enableHistory !== undefined && history === undefined) {
    if (typeof rawConfig.enableHistory === 'boolean') {
      enableHistory = rawConfig.enableHistory;
    } else if (rawConfig.enableHistory === 'auto') {
      enableHistory = 'auto';
    }
  }

  let consoleProgress: 'auto' | 'line' | 'dot' | boolean = 'auto';

  if (rawConfig?.consoleProgress !== undefined) {
    if (typeof rawConfig.consoleProgress === 'boolean') {
      consoleProgress = rawConfig.consoleProgress;
    } else if (
      rawConfig.consoleProgress === 'auto' ||
      rawConfig.consoleProgress === 'line' ||
      rawConfig.consoleProgress === 'dot'
    ) {
      consoleProgress = rawConfig.consoleProgress;
    }
  }

  let openAutomatically: 'always' | 'never' | 'on-failure-only' = 'never';

  if (
    rawConfig?.openAutomatically === 'always' ||
    rawConfig?.openAutomatically === 'never' ||
    rawConfig?.openAutomatically === 'on-failure-only'
  ) {
    openAutomatically = rawConfig.openAutomatically;
  }

  return {
    outputDir,
    packageManager,
    projectName,
    testRunName,
    singleSummaryFile,
    theme,
    darkMode,
    enableHistory,
    history,
    minimalReport,
    consoleProgress,
    openAutomatically,
  };
}

/**
 * Custom Playwright Test reporter generating interactive HTML and structured JSON reports.
 */
class ZenReporter implements Reporter {
  private config!: FullConfig;
  private reportConfig!: ReporterConfig;
  private testCaseMap = new Map<string, TestCaseModel>();
  private startTime = '';
  private testCases: TestCaseModel[] = [];
  private options?: Record<string, unknown>;
  private progressPrinter = new ProgressPrinter();

  /**
   * Constructs a new ZenReporter instance.
   *
   * @param options - Optional reporter options override.
   */
  constructor(options?: Record<string, unknown>) {
    this.options = options;
  }

  /** Resets internal run state before commencing a test run. */
  private resetRunState(): void {
    this.testCaseMap.clear();
    this.testCases = [];
    this.progressPrinter.reset();
  }

  /**
   * Groups flat test case models into hierarchical test suite structures.
   *
   * @returns List of processed test suites.
   */
  private buildSuites(): TestSuite[] {
    return buildSuitesFromCases(this.testCases);
  }

  /**
   * Initializes a internal `TestCaseModel` from Playwright's `TestCase` object.
   *
   * @param test - Playwright TestCase object.
   * @param initialStatus - Initial status to assign.
   * @returns Structured TestCaseModel instance.
   */
  private createTestCaseModel(
    test: TestCase,
    initialStatus: TestCaseModel['status']
  ): TestCaseModel {
    const fileName = test.location?.file
      ? test.location.file.replace(process.cwd(), '')
      : test.parent.location?.file
        ? test.parent.location.file.replace(process.cwd(), '')
        : 'unknown file';

    const testCase: TestCaseModel = {
      title: test.title,
      parent: test.parent.title,
      project: test.parent.project()?.name || 'unknown',
      fileName,
      status: initialStatus,
      duration: 0,
      steps: [],
      stdout: [],
      stderr: [],
      annotations: test.annotations
        ? test.annotations.map((a) => ({
            type: a.type,
            description: a.description || null,
            location: a.location
              ? {
                  file: a.location.file,
                  line: a.location.line,
                  column: a.location.column,
                }
              : null,
          }))
        : [],
      attachments: [],
      tags: test.tags.flatMap((tag) => tag.replace('@', '')),
      describePath: getDescribePath(test),
      attempts: 0,
      failedAttempts: [],
    };

    testCase.tags?.push(testCase.project);

    return testCase;
  }

  /**
   * Maps Playwright test result errors to internal `TestError` models.
   *
   * @param resultError - Playwright test error object.
   * @returns Array of TestError objects or undefined.
   */
  private mapTestError(resultError: TestResult['error']): TestError[] | undefined {
    if (!resultError) return undefined;

    return [
      {
        name: 'Error',
        message: sanitizeAnsi(resultError.message || ''),
        stack: sanitizeAnsi(resultError.stack || ''),
        location: resultError.location
          ? {
              file: resultError.location.file,
              line: resultError.location.line,
              column: resultError.location.column,
            }
          : null,
        snippet: resultError.snippet || '',
        cause: (resultError.cause as unknown as TestError) || null,
      },
    ];
  }

  /**
   * Normalizes stdout/stderr chunks into discrete lines.
   * Strips an optional trailing newline so standard log statements don't produce an extra empty line.
   *
   * @param entries - Array of string or Buffer output chunks from Playwright test result.
   * @returns Array of discrete line strings, or undefined if empty.
   */
  private processOutputEntries(entries: (string | Buffer)[] | undefined): string[] | undefined {
    if (!entries || entries.length === 0) return undefined;

    const fullText = entries
      .map((entry) => (typeof entry === 'string' ? entry : entry.toString('utf8')))
      .join('');

    if (!fullText) return undefined;

    const lines = fullText.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    return lines.length > 0 ? lines : undefined;
  }

  /**
   * Computes high-level result summary statistics for the completed test run.
   *
   * @param endTime - ISO timestamp of completion.
   * @param wallClockDuration - Total wall clock duration in milliseconds.
   * @returns ResultSummary metrics object.
   */
  private computeResultSummary(endTime: string, wallClockDuration: number): ResultSummary {
    let flaky = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let timedOut = 0;
    let interrupted = 0;
    let totalSequentialDuration = 0;

    for (const tc of this.testCases) {
      totalSequentialDuration += tc.duration || 0;
      switch (tc.status) {
        case 'passed':
          if ((tc.failedAttempts?.length ?? 0) > 0) {
            flaky++;
          } else {
            passed++;
          }
          break;
        case 'failed':
          failed++;
          break;
        case 'skipped':
          skipped++;
          break;
        case 'timedOut':
          timedOut++;
          break;
        case 'interrupted':
          interrupted++;
          break;
      }
    }
    const numberOfProjects = this.config.projects.length;

    const gitCommitInfo = getGitCommit();

    return {
      total: this.testCases.length,
      passed,
      flaky,
      failed,
      skipped,
      timedOut,
      interrupted,
      startTime: this.startTime,
      endTime,
      duration: wallClockDuration,
      totalSequentialDuration,
      numberOfProjects,
      workers: this.config?.workers,
      playwrightVersion: getPlaywrightVersion(),
      osName: getOsName(),
      gitBranch: getGitBranch(),
      gitCommit: gitCommitInfo.short,
      gitCommitFull: gitCommitInfo.full,
    };
  }

  /**
   * Playwright lifecycle hook called before running tests.
   *
   * @param config - Full Playwright test configuration.
   * @param suite - Root test suite object.
   */
  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.reportConfig = resolveConfig(
      this.options ||
        (config as FullConfig & { reporterConfig?: Record<string, unknown> }).reporterConfig,
      process.cwd(),
      config.configFile ? path.dirname(config.configFile) : process.cwd()
    );

    if (this.reportConfig.enableHistory === true) {
      try {
        require.resolve('@duckdb/node-api');
      } catch {
        throw new Error(
          'Zen Reporter: history is explicitly enabled (enableHistory: true), but "@duckdb/node-api" is not installed. Please install "@duckdb/node-api" or set enableHistory to "auto" or false.'
        );
      }
    }

    this.startTime = new Date().toISOString();

    const allTests = suite.allTests();
    this.resetRunState();

    let progressMode: ProgressMode;
    const cp = this.reportConfig.consoleProgress;

    if (cp === false) {
      progressMode = 'none';
    } else if (cp === 'line') {
      progressMode = 'line';
    } else if (cp === 'dot') {
      progressMode = 'dot';
    } else {
      const isTTY =
        typeof process !== 'undefined' && process.stdout && Boolean(process.stdout.isTTY);
      progressMode = isTTY ? 'line' : 'dot';
    }

    this.progressPrinter.init(allTests.length, progressMode);

    if (progressMode === 'dot') {
      const workers = this.config.workers || 1;
      const workerStr = workers === 1 ? '1 worker (serially)' : `${workers} workers (in parallel)`;
      console.log(
        `Running total ${allTests.length} tests, ${workerStr}\n\nLegend: . passed | F failed | T timed out | I interrupted | ± flaky | s skipped\n`
      );
    }

    for (const test of allTests) {
      const testCase = this.createTestCaseModel(test, 'skipped');
      this.testCaseMap.set(test.id, testCase);
    }
  }

  /**
   * Playwright lifecycle hook called when a test case begins execution.
   *
   * @param test - Playwright TestCase object.
   * @param _result - Playwright TestResult object.
   */
  onTestBegin(test: TestCase, _result: TestResult): void {
    this.progressPrinter.onWorkerStart(test.id);

    let existing = this.testCaseMap.get(test.id);
    if (!existing) {
      existing = this.createTestCaseModel(test, 'passed');
      this.testCaseMap.set(test.id, existing);
    }

    existing.attempts = (existing.attempts ?? 0) + 1;
  }

  /**
   * Playwright lifecycle hook called when a test case finishes execution.
   *
   * @param test - Playwright TestCase object.
   * @param result - Playwright TestResult object.
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    const testCase = this.testCaseMap.get(test.id);
    if (!testCase) return;

    testCase.status =
      result.status === 'passed'
        ? 'passed'
        : result.status === 'failed'
          ? 'failed'
          : result.status === 'skipped'
            ? 'skipped'
            : result.status === 'timedOut'
              ? 'timedOut'
              : result.status === 'interrupted'
                ? 'interrupted'
                : 'failed';

    const attemptSteps =
      result.steps && result.steps.length > 0
        ? convertPlaywrightSteps(result.steps, fs)
        : undefined;
    const stepDurationSum = attemptSteps
      ? attemptSteps.reduce((sum, step) => sum + (step.duration || 0), 0)
      : 0;
    const attemptDuration =
      typeof result.duration === 'number' && result.duration > 0
        ? result.duration
        : stepDurationSum;

    testCase.duration = attemptDuration;

    if (test.annotations) {
      testCase.annotations = test.annotations.map((a) => ({
        type: a.type,
        description: a.description || null,
        location: a.location
          ? {
              file: a.location.file,
              line: a.location.line,
              column: a.location.column,
            }
          : null,
      }));
    }

    const attemptStdout = this.processOutputEntries(result.stdout);
    const attemptStderr = this.processOutputEntries(result.stderr);

    const attemptAttachments = processAttachments(
      test.id,
      result.attachments,
      this.reportConfig.outputDir
    );
    testCase.attachments = attemptAttachments;
    testCase.errors = this.mapTestError(result.error);

    if (
      result.status === 'failed' ||
      result.status === 'timedOut' ||
      result.status === 'interrupted'
    ) {
      testCase.failedAttempts = testCase.failedAttempts ?? [];
      testCase.failedAttempts.push({
        status: result.status,
        duration: attemptDuration,
        error: testCase.errors && testCase.errors.length > 0 ? testCase.errors[0] : null,
        steps: attemptSteps,
        stdout: attemptStdout,
        stderr: attemptStderr,
        attachments: attemptAttachments,
      });
    }

    testCase.steps = attemptSteps;
    testCase.stdout = attemptStdout;
    testCase.stderr = attemptStderr;

    const status = testCase.status;
    const projStr =
      testCase.project && testCase.project !== 'unknown' ? `[${testCase.project}] ` : '';
    const shortName = `${projStr}${testCase.fileName} › ${testCase.title}`;

    if (status === 'failed' || status === 'timedOut' || status === 'interrupted') {
      this.progressPrinter.clearLineProgress();
      const durationStr = testCase.duration > 0 ? ` (${testCase.duration}ms)` : '';
      const isRetrying = (result.retry ?? 0) < (test.retries ?? 0);
      if (isRetrying) {
        console.log(
          `🔁 [RETRYING] ${shortName}${durationStr} (attempt ${result.retry + 1}/${test.retries + 1})`
        );
      } else if (status === 'timedOut') {
        console.log(`⏱️ [TIMED OUT] ${shortName}${durationStr}`);
      } else if (status === 'interrupted') {
        console.log(`⚡ [INTERRUPTED] ${shortName}${durationStr}`);
      } else {
        console.log(`❌ [FAILED] ${shortName}${durationStr}`);
      }
    } else if (status === 'passed' && (result.retry ?? 0) > 0) {
      this.progressPrinter.clearLineProgress();
      const durationStr = testCase.duration > 0 ? ` (${testCase.duration}ms)` : '';
      console.log(
        `🔄 [FLAKY] ${shortName}${durationStr} (passed on attempt ${result.retry + 1}/${(test.retries ?? 0) + 1})`
      );
    }

    let dotStatus: TestStatus = status;

    if (status === 'passed' && (testCase.failedAttempts?.length ?? 0) > 0) {
      dotStatus = 'flaky';
    }

    this.progressPrinter.onTestComplete(test.id, dotStatus, shortName);
  }

  /**
   * Playwright lifecycle hook called after all tests complete.
   *
   * @param result - Full test execution result details.
   */
  async onEnd(result: FullResult): Promise<void> {
    this.progressPrinter.clearLineProgress();
    console.log(
      '\n\x1b[33m⚡\x1b[0m Zen Reporter: Processing test results and generating report...'
    );

    if (result.status === 'interrupted') {
      for (const testCase of this.testCaseMap.values()) {
        if ((testCase.attempts ?? 0) === 0) {
          testCase.status = 'interrupted';
        }
      }
    }

    this.testCases = Array.from(this.testCaseMap.values());

    const endTime = new Date().toISOString();
    const startTimeMs = new Date(this.startTime).getTime();
    const endTimeMs = new Date(endTime).getTime();
    const wallClockDuration = Math.max(0, endTimeMs - startTimeMs);
    const summary = this.computeResultSummary(endTime, wallClockDuration);
    const suites = this.buildSuites();
    const stepCategories = countStepCategories(suites);

    if (this.reportConfig.enableHistory !== false) {
      const historyOptions =
        typeof this.reportConfig.history === 'object' &&
        this.reportConfig.history !== null &&
        this.reportConfig.history.mode === 'local'
          ? this.reportConfig.history
          : undefined;

      await writeRunHistory({
        startTime: this.startTime,
        testRunName: this.reportConfig.testRunName,
        projectName: this.reportConfig.projectName,
        shard: this.config?.shard,
        outputDir: this.reportConfig.outputDir,
        summary,
        endedAt: endTime,
        testCases: this.testCases,
        stepCategories,
        historyConfig: this.reportConfig.history,
        dbPath: historyOptions?.dbPath,
        maxRuns: historyOptions?.maxRuns,
        windowSize: historyOptions?.windowSize,
      });
    }

    const testRun: TestRunModel = {
      summary,
      suites,
      projectName: this.reportConfig.projectName,
      testRunName: this.reportConfig.testRunName,
      theme: this.reportConfig.theme,
      darkMode: this.reportConfig.darkMode,
      enableHistory: this.reportConfig.enableHistory,
      minimalReport: this.reportConfig.minimalReport,
    };

    const reportData: ReportData = { testRun };

    const cwd = process.cwd();
    const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
    const outputDir = path.resolve(normalizedCwd, this.reportConfig.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });

    const jsonPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), 'utf8');

    const summaryTable = generateTerminalSummaryTable(
      summary,
      this.reportConfig.projectName,
      this.reportConfig.testRunName
    );
    console.log('\n' + summaryTable);

    generateHtmlReport(outputDir, reportData, summary, {
      outputDir: this.reportConfig.outputDir,
      packageManager: this.reportConfig.packageManager,
      enableHistory: this.reportConfig.enableHistory,
      singleSummaryFile: this.reportConfig.singleSummaryFile,
      openAutomatically: this.reportConfig.openAutomatically,
    });
  }
}

export { getShowReportCommand, updateReportHtmlFiles } from './htmlReportGenerator';
export { SqliteHistoryStore } from './history/SqliteHistoryStore';
export type {
  CleanHistoryOptions,
  CleanHistoryResult,
  ConflictingRunDetail,
} from './history/SqliteHistoryStore';
export { RemoteHistoryStore } from './history/RemoteHistoryStore';
export { migrateJsonlToSqlite } from './history/migration';
export type { MigrationOptions, MigrationResult } from './history/migration';
export type { DisabledHistoryConfig, HistoryConfig, LocalHistoryConfig, RemoteHistoryConfig };
export default ZenReporter;
