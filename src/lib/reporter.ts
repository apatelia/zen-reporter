import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { execFileSync, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { detectPackageManager, getViteBuildCommand } from './dataProcessor';
import { buildRunId, flattenRunRows } from './runHistory';
import type {
  ReportData,
  ResultSummary,
  TestCase as TestCaseModel,
  TestError,
  TestRun as TestRunModel,
  TestSuite,
} from './types';
import {
  buildSuitesFromCases,
  convertPlaywrightSteps,
  generateTerminalSummaryTable,
  sanitizeAnsi,
  setFsModule,
} from './utils';

setFsModule(fs);

function getDescribePath(test: TestCase): string[] {
  const path: string[] = [];
  let curr: Suite | undefined = test.parent;
  while (curr) {
    if (curr.type === 'file' || curr.type === 'project' || curr.type === 'root') {
      break;
    }
    if (curr.type === 'describe' && curr.title) {
      path.unshift(curr.title);
    }
    curr = curr.parent;
  }
  return path;
}

export interface ReporterConfig {
  outputDir: string;
  packageManager: string;
  projectName: string;
  testRunName: string;
  singleSummaryFile?: boolean;
  theme?: string;
  darkMode?: boolean;
  enableHistory: 'auto' | boolean;
  minimalReport?: boolean;
  consoleProgress: 'auto' | 'line' | 'dot' | boolean;
}

export function resolveConfig(
  rawConfig?: Record<string, unknown>,
  cwd: string = process.cwd()
): ReporterConfig {
  const outputDir = rawConfig?.outputDir ? String(rawConfig.outputDir) : 'zen-report';
  const packageManager = detectPackageManager(cwd);
  const projectName = rawConfig?.projectName
    ? String(rawConfig.projectName)
    : 'Test Automation Project';
  let runNumber = 1;
  try {
    const runsDir = path.resolve(cwd, outputDir, 'runs');
    if (fs.existsSync(runsDir)) {
      const files = fs.readdirSync(runsDir);
      const runFiles = files.filter((f) => f.endsWith('.jsonl'));
      runNumber = runFiles.length + 1;
    }
  } catch {
    runNumber = 1;
  }
  const rawTestRunName = rawConfig?.testRunName ? String(rawConfig.testRunName) : 'Test Run #{N}';
  const testRunName = rawTestRunName.replaceAll('{N}', String(runNumber));
  const singleSummaryFile = Boolean(rawConfig?.singleSummaryFile);
  const theme = rawConfig?.theme !== undefined ? String(rawConfig.theme) : 'Cafe';
  const darkMode = Boolean(rawConfig?.darkMode);
  const minimalReport = Boolean(rawConfig?.minimalReport);

  let enableHistory: 'auto' | boolean = 'auto';
  if (minimalReport) {
    enableHistory = false;
  } else if (rawConfig?.enableHistory !== undefined) {
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

  return {
    outputDir,
    packageManager,
    projectName,
    testRunName,
    singleSummaryFile,
    theme,
    darkMode,
    enableHistory,
    minimalReport,
    consoleProgress,
  };
}

class ZenReporter implements Reporter {
  private config!: FullConfig;
  private reportConfig!: ReporterConfig;
  private testCaseMap = new Map<string, TestCaseModel>();
  private startTime = '';
  private testCases: TestCaseModel[] = [];
  private options?: Record<string, unknown>;

  // Console progress tracking
  private totalTests = 0;
  private completedTests = 0;
  private completedTestIds = new Set<string>();
  private passedCount = 0;
  private failedCount = 0;
  private timedOutCount = 0;
  private skippedCount = 0;
  private activeWorkers = new Set<string>();
  private lastCompletedTest = '';
  private dotLineLength = 0;
  private progressMode: 'line' | 'dot' | 'none' = 'none';

  constructor(options?: Record<string, unknown>) {
    this.options = options;
  }

  private printLineProgress(): void {
    if (this.progressMode !== 'line') return;
    const isTTY = typeof process !== 'undefined' && process.stdout && Boolean(process.stdout.isTTY);
    if (!isTTY) return;

    const pct = this.totalTests > 0 ? Math.floor((this.completedTests / this.totalTests) * 100) : 0;
    const workersCount = this.activeWorkers.size;
    const workerStr = `${workersCount} active worker${workersCount === 1 ? '' : 's'}`;

    let line = `[ ${this.completedTests}/${this.totalTests} ] ${pct}% | ✅ ${this.passedCount} | ❌ ${this.failedCount + this.timedOutCount} | ⏭️ ${this.skippedCount} (${workerStr})`;

    if (this.lastCompletedTest) {
      line += ` | Last: ${this.lastCompletedTest}`;
    }

    const cols = process.stdout.columns || 100;
    if (line.length > cols - 1) {
      line = line.slice(0, Math.max(10, cols - 4)) + '...';
    }

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(line);
  }

  private clearLineProgress(): void {
    if (
      this.progressMode === 'line' &&
      typeof process !== 'undefined' &&
      process.stdout &&
      Boolean(process.stdout.isTTY)
    ) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    }
  }

  private handleDotProgress(
    status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky'
  ): void {
    if (this.progressMode !== 'dot') return;

    const isFail = status === 'failed' || status === 'timedOut' || status === 'interrupted';
    const isSkip = status === 'skipped';
    const isFlaky = status === 'flaky';
    const symbol = isFail ? 'F' : isSkip ? 's' : isFlaky ? '±' : '.';

    process.stdout.write(symbol);
    this.dotLineLength += 1;

    if (this.dotLineLength >= 80 || this.completedTestIds.size === this.totalTests) {
      process.stdout.write(` [ ${this.completedTestIds.size}/${this.totalTests} ]\n`);
      this.dotLineLength = 0;
    }
  }

  private buildSuites(): TestSuite[] {
    return buildSuitesFromCases(this.testCases);
  }

  /**
   * Persist every run as a self-contained per-run JSONL file under
   * <outputDir>/runs/ so historic runs survive report rebuilds.
   * Failure policy: catch-and-log only — history writing must never break
   * report/HTML generation.
   */
  private writeRunHistory(summary: ResultSummary, endedAt: string): void {
    try {
      const runId = buildRunId(this.startTime, this.reportConfig.testRunName, this.config.shard);
      const cwd = process.cwd();
      const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
      const runsDir = path.resolve(normalizedCwd, this.reportConfig.outputDir, 'runs');
      // Collision guard (two invocations same ms + same name): append -2, -3, ...
      let finalRunId = runId;
      let suffix = 2;
      while (fs.existsSync(path.join(runsDir, `${finalRunId}.jsonl`))) {
        finalRunId = `${runId}-${suffix}`;
        suffix += 1;
      }
      const rows = flattenRunRows(
        finalRunId,
        this.reportConfig.testRunName,
        this.reportConfig.projectName,
        summary,
        endedAt,
        this.testCases
      );
      fs.mkdirSync(runsDir, { recursive: true });
      fs.writeFileSync(
        path.join(runsDir, `${finalRunId}.jsonl`),
        rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
        'utf8'
      );
    } catch (e) {
      console.error('Run history write failed:', e);
    }
  }

  /**
   * Regenerate `history.json` by running the CLI's `history report`
   * subcommand (the CLI owns the DuckDB aggregate queries — single source
   * of truth) and inject the fresh snapshot into `<outputDir>/index.html`.
   * Runs after the new run's JSONL has been written, so it includes the
   * just-finished run. Best-effort: any failure (missing @duckdb/node-api,
   * missing bin, spawn error) is caught and logged; the snapshot that was
   * re-injected above remains in the report.
   */
  private refreshHistory(): void {
    try {
      // Locate the shipped CLI: walk up from this module to the directory
      // containing bin/zen-reporter.js (dist/ → package root in shipped
      // builds; src/lib → repo root in dev).
      const moduleFile =
        typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
      let dir = path.dirname(moduleFile);
      let binPath: string | null = null;
      for (let i = 0; i < 4; i++) {
        const candidate = path.join(dir, 'bin', 'zen-reporter.js');
        if (fs.existsSync(candidate)) {
          binPath = candidate;
          break;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
      if (!binPath) return;

      execFileSync(process.execPath, [binPath, 'history', 'report'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env, PW_REPORTER_OUTPUT: this.reportConfig.outputDir },
      });
    } catch {
      // stdio: 'inherit' already output any user-facing CLI error (such as missing optional @duckdb/node-api package).
      // Avoid printing raw ExecFileSyncError stack traces in consumer test output.
      console.warn('History refresh skipped (keeping existing history data).');
    }
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.reportConfig = resolveConfig(
      this.options ||
        (config as FullConfig & { reporterConfig?: Record<string, unknown> }).reporterConfig
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
    this.testCaseMap.clear();
    this.testCases = [];

    const allTests = suite.allTests();
    this.totalTests = allTests.length;
    this.completedTests = 0;
    this.completedTestIds.clear();
    this.passedCount = 0;
    this.failedCount = 0;
    this.timedOutCount = 0;
    this.skippedCount = 0;
    this.activeWorkers.clear();
    this.lastCompletedTest = '';
    this.dotLineLength = 0;

    const cp = this.reportConfig.consoleProgress;
    if (cp === false) {
      this.progressMode = 'none';
    } else if (cp === 'line') {
      this.progressMode = 'line';
    } else if (cp === 'dot') {
      this.progressMode = 'dot';
    } else {
      const isTTY =
        typeof process !== 'undefined' && process.stdout && Boolean(process.stdout.isTTY);
      this.progressMode = isTTY ? 'line' : 'dot';
    }

    if (this.progressMode === 'dot') {
      const workers = this.config.workers || 1;
      const workerStr = workers === 1 ? '1 worker (serially)' : `${workers} workers (in parallel)`;
      console.log(
        `Running total ${this.totalTests} tests, ${workerStr}\n\nLegend: . passed | F failed | ± flaky | s skipped\n`
      );
    }

    for (const test of allTests) {
      const fileName = test.location?.file
        ? test.location.file.replace(process.cwd(), '')
        : 'unknown file';

      const testCase: TestCaseModel = {
        title: test.title,
        parent: test.parent.title,
        project: test.parent.project()?.name || 'unknown',
        fileName,
        status: 'skipped',
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
      this.testCaseMap.set(test.id, testCase);
    }
  }

  onTestBegin(test: TestCase, _result: TestResult): void {
    this.activeWorkers.add(test.id);
    if (this.progressMode === 'line') {
      this.printLineProgress();
    }
    let existing = this.testCaseMap.get(test.id);
    if (!existing) {
      const fileName = test.parent.location?.file
        ? test.parent.location.file.replace(process.cwd(), '')
        : 'unknown file';

      existing = {
        title: test.title,
        parent: test.parent.title,
        project: test.parent.project()?.name || 'unknown',
        fileName,
        status: 'passed',
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

      existing.tags?.push(existing.project);
      this.testCaseMap.set(test.id, existing);
    }

    existing.attempts = (existing.attempts ?? 0) + 1;
  }

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
    // Compute this attempt's details once and share them between the final
    // attempt (the TestCase model) and the failed-attempt records, so each
    // recorded attempt can render its own steps/output/attachments.
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

    const attemptStdout = (result.stdout || []).map((entry) =>
      typeof entry === 'string' ? entry : entry.toString('utf8')
    );
    const attemptStderr = (result.stderr || []).map((entry) =>
      typeof entry === 'string' ? entry : entry.toString('utf8')
    );
    const cwd = process.cwd();
    const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
    const outputDir = path.resolve(normalizedCwd, this.reportConfig.outputDir);
    const attachmentsDir = path.join(outputDir, 'attachments');

    const attemptAttachments = (result.attachments || []).map((att, attIdx) => {
      let bodyData: string | null = null;
      let finalPath: string | null = att.path || null;

      const isText =
        att.contentType?.startsWith('text/') ||
        /\.(txt|log|json|csv|html|xml|md|yaml|yml|js|ts|jsx|tsx|css)$/i.test(
          att.name || att.path || ''
        );

      // If att has a file on disk, copy to outputDir/attachments
      if (att.path && fs.existsSync(att.path)) {
        try {
          fs.mkdirSync(attachmentsDir, { recursive: true });
          const safeName = path.basename(att.path).replace(/[^a-zA-Z0-9._-]/g, '_');
          const safeTestId = test.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const targetFilename = `${safeTestId}_att${attIdx}_${safeName}`;
          const targetPath = path.join(attachmentsDir, targetFilename);
          fs.copyFileSync(att.path, targetPath);
          finalPath = `./attachments/${targetFilename}`;

          // Only store small text attachments inline
          if (isText) {
            bodyData = fs.readFileSync(att.path, 'utf8');
          }
        } catch (e) {
          console.error(`Failed to copy attachment file from ${att.path}:`, e);
        }
      } else if (att.body) {
        // Buffer or string in memory
        if (isText) {
          bodyData = Buffer.isBuffer(att.body)
            ? att.body.toString('utf8')
            : typeof att.body === 'string'
              ? att.body
              : String(att.body);
        } else {
          // Binary buffer in memory - write to attachments folder
          try {
            fs.mkdirSync(attachmentsDir, { recursive: true });
            const ext =
              att.contentType === 'image/png'
                ? '.png'
                : att.contentType === 'image/jpeg'
                  ? '.jpg'
                  : '.bin';
            const safeTestId = test.id.replace(/[^a-zA-Z0-9_-]/g, '_');
            const targetFilename = `${safeTestId}_att${attIdx}${ext}`;
            const targetPath = path.join(attachmentsDir, targetFilename);
            const buf = Buffer.isBuffer(att.body) ? att.body : Buffer.from(att.body);
            fs.writeFileSync(targetPath, buf);
            finalPath = `./attachments/${targetFilename}`;
          } catch (e) {
            console.error('Failed to write in-memory attachment to disk:', e);
          }
        }
      }

      return {
        name: att.name,
        contentType: att.contentType,
        path: finalPath,
        body: bodyData,
      };
    });

    // Always mirror the last attempt's data into the TestCase model so a
    // successful retry doesn't leak the previous attempt's errors/output.
    testCase.attachments = attemptAttachments.length > 0 ? attemptAttachments : undefined;

    testCase.errors = result.error
      ? [
          {
            name: 'Error',
            message: sanitizeAnsi(result.error.message || ''),
            stack: sanitizeAnsi(result.error.stack || ''),
            location: result.error.location
              ? {
                  file: result.error.location.file,
                  line: result.error.location.line,
                  column: result.error.location.column,
                }
              : null,
            snippet: result.error.snippet || '',
            cause: (result.error.cause as unknown as TestError) || null,
          },
        ]
      : undefined;

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
        stdout: attemptStdout.length > 0 ? attemptStdout : undefined,
        stderr: attemptStderr.length > 0 ? attemptStderr : undefined,
        attachments: attemptAttachments.length > 0 ? attemptAttachments : undefined,
      });
    }

    testCase.steps = attemptSteps;
    testCase.stdout = attemptStdout.length > 0 ? attemptStdout : undefined;
    testCase.stderr = attemptStderr.length > 0 ? attemptStderr : undefined;

    this.activeWorkers.delete(test.id);
    this.completedTestIds.add(test.id);
    this.completedTests = this.completedTestIds.size;

    const status = testCase.status;
    if (status === 'passed') this.passedCount += 1;
    else if (status === 'failed') this.failedCount += 1;
    else if (status === 'timedOut') this.timedOutCount += 1;
    else if (status === 'skipped') this.skippedCount += 1;

    const projStr =
      testCase.project && testCase.project !== 'unknown' ? `[${testCase.project}] ` : '';
    const shortName = `${projStr}${testCase.fileName} › ${testCase.title}`;
    this.lastCompletedTest = shortName;

    if (this.progressMode === 'line') {
      if (status === 'failed' || status === 'timedOut' || status === 'interrupted') {
        this.clearLineProgress();
        const durationStr = testCase.duration > 0 ? ` (${testCase.duration}ms)` : '';
        console.log(`❌ [FAILED] ${shortName}${durationStr}`);
      }
      this.printLineProgress();
    } else if (this.progressMode === 'dot') {
      let dotStatus: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky' =
        status;
      if (status === 'passed' && (testCase.failedAttempts?.length ?? 0) > 0) {
        dotStatus = 'flaky';
      }
      this.handleDotProgress(dotStatus);
    }
  }

  onEnd(result: FullResult): void {
    if (this.progressMode === 'line') {
      this.clearLineProgress();
    } else if (this.progressMode === 'dot') {
      if (this.dotLineLength > 0) {
        process.stdout.write(` [ ${this.completedTests}/${this.totalTests} ]\n`);
        this.dotLineLength = 0;
      }
    }

    if (result.status === 'interrupted') {
      for (const testCase of this.testCaseMap.values()) {
        if ((testCase.attempts ?? 0) === 0) {
          testCase.status = 'interrupted';
        }
      }
    }

    // `onTestBegin`/`onTestEnd` fire per attempt (including retries).
    // `testCaseMap` always holds the final attempt's model, so derive
    // the flat list here instead of accumulating one entry per attempt.
    this.testCases = Array.from(this.testCaseMap.values());
    const endTime = new Date().toISOString();
    const startTimeMs = new Date(this.startTime).getTime();
    const endTimeMs = new Date(endTime).getTime();
    const wallClockDuration = Math.max(0, endTimeMs - startTimeMs);

    const passed = this.testCases.filter((tc) => tc.status === 'passed').length;
    const failed = this.testCases.filter((tc) => tc.status === 'failed').length;
    const skipped = this.testCases.filter((tc) => tc.status === 'skipped').length;
    const timedOut = this.testCases.filter((tc) => tc.status === 'timedOut').length;
    const interrupted = this.testCases.filter((tc) => tc.status === 'interrupted').length;
    const numberOfProjects = this.config.projects.length;
    const totalSequentialDuration = this.testCases.reduce((sum, tc) => sum + (tc.duration || 0), 0);

    const summary: ResultSummary = {
      total: this.testCases.length,
      passed,
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
    };

    const suites = this.buildSuites();
    if (this.reportConfig.enableHistory !== false) {
      this.writeRunHistory(summary, endTime);
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

    // Output failed test list (in dot mode) and ASCII summary table
    if (this.progressMode === 'dot') {
      const failedCases = this.testCases.filter(
        (tc) => tc.status === 'failed' || tc.status === 'timedOut' || tc.status === 'interrupted'
      );
      if (failedCases.length > 0) {
        console.log('\nFailed Tests:');
        for (const tc of failedCases) {
          const projStr = tc.project && tc.project !== 'unknown' ? `[${tc.project}] ` : '';
          const durationStr = tc.duration > 0 ? ` (${tc.duration}ms)` : '';
          console.log(`❌ [FAILED] ${projStr}${tc.fileName} › ${tc.title}${durationStr}`);
        }
      }
    }

    const summaryTable = generateTerminalSummaryTable(
      summary,
      this.reportConfig.projectName,
      this.reportConfig.testRunName
    );
    console.log('\n' + summaryTable);

    // Generate the single-file HTML report by injecting report.json data into pre-built template
    try {
      const pm = this.reportConfig.packageManager;
      // Works in both shipped bundles: __filename in CJS, import.meta.url in ESM.
      // The bundle lives in dist/, one level below the package root.
      const moduleFile =
        typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
      const moduleDir = path.dirname(moduleFile);
      const packageRoot =
        moduleDir.endsWith(path.join('src', 'lib')) || moduleDir.endsWith('src/lib')
          ? path.resolve(moduleDir, '..', '..')
          : path.resolve(moduleDir, '..');

      const possibleTemplatePaths = [
        path.join(packageRoot, 'assets', 'template.html'),
        path.join(packageRoot, 'dist', 'index.html'),
        path.join(packageRoot, 'dist', 'template.html'),
      ];
      let templateContent: string | null = null;
      for (const p of possibleTemplatePaths) {
        if (fs.existsSync(p)) {
          try {
            templateContent = fs.readFileSync(p, 'utf8');
            break;
          } catch {
            /* ignore */
          }
        }
      }

      // If template is missing in dev mode, run vite build once to create it
      if (!templateContent) {
        const buildCmd = getViteBuildCommand(pm, packageRoot);
        execSync(buildCmd, {
          cwd: packageRoot,
          stdio: 'pipe',
          env: { ...process.env, PW_REPORTER_OUTPUT: outputDir },
        });
        for (const p of possibleTemplatePaths) {
          if (fs.existsSync(p)) {
            try {
              templateContent = fs.readFileSync(p, 'utf8');
              break;
            } catch {
              /* ignore */
            }
          }
        }
      }

      if (templateContent) {
        const safeData = JSON.stringify(reportData).replace(/</g, '\\u003c');
        const dataScript = `<script id="report-data" type="application/json">${safeData}</script>`;

        // Strip any existing report-data script tag in template before injecting
        const cleanTemplate = templateContent.replace(
          /<script id="report-data" type="application\/json">[\s\S]*?<\/script>/,
          ''
        );
        let finalHtml = cleanTemplate.replace('</head>', `${dataScript}\n</head>`);

        // Re-inject history data (computed by `zr history report`) so the
        // History tab survives the report rebuild on every test run.
        // summary.html is deliberately left untouched (History unreachable there).
        const historyPath = path.join(outputDir, 'history.json');
        if (fs.existsSync(historyPath)) {
          try {
            const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            const historyScript = `<script id="history-data" type="application/json">${JSON.stringify(history).replace(/</g, '\\u003c')}</script>`;
            finalHtml = finalHtml
              .replace(/<script id="history-data" type="application\/json">[\s\S]*?<\/script>/, '')
              .replace('</head>', `${historyScript}\n</head>`);
          } catch (e) {
            console.error('History data injection failed:', e);
          }
        }
        const destHtml = path.join(outputDir, 'index.html');
        fs.writeFileSync(destHtml, finalHtml, 'utf8');
        console.debug(`\n✓ Report generated: ${destHtml}`);
        console.log(`\n💡 Run "${getShowReportCommand(pm)}" to view the report in web browser.\n`);

        // Auto-refresh: regenerate history.json from all runs via the CLI
        // and inject the fresh snapshot into the just-written index.html.
        if (this.reportConfig.enableHistory !== false) {
          this.refreshHistory();
        }

        if (this.reportConfig.singleSummaryFile) {
          const summaryHtmlPath = path.join(outputDir, 'summary.html');
          const summaryScript = `<script>window.__ZEN_SUMMARY_ONLY__ = true;</script>`;
          const summaryHtml = cleanTemplate.replace(
            '</head>',
            `${dataScript}\n${summaryScript}\n</head>`
          );
          fs.writeFileSync(summaryHtmlPath, summaryHtml, 'utf8');
          console.debug(`✓ Standalone Summary generated: ${summaryHtmlPath}`);
        }
      } else {
        console.error('Report template not found and build failed.');
      }
    } catch (err) {
      console.error('Report generation failed, keeping report.json:', err);
    }
  }
}

export function getShowReportCommand(pm?: string, cwd: string = process.cwd()): string {
  const manager = pm || detectPackageManager(cwd);
  switch (manager) {
    case 'pnpm':
      return 'pnpm zr show';
    case 'yarn':
      return 'yarn zr show';
    case 'bun':
      return 'bunx zr show';
    default:
      return 'npx zr show';
  }
}

export default ZenReporter;
