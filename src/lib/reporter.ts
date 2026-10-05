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
import { fileURLToPath } from 'url';
import { convertPlaywrightSteps, sanitizeAnsi, setFsModule } from './codeHighlighting';
import { generateTerminalSummaryTable } from './cryptoUtils';
import { detectPackageManager, getViteBuildCommand } from './dataProcessor';
import { ProgressPrinter, type ProgressMode } from './progressPrinter';
import { writeRunHistory } from './runHistoryWriter';
import { buildSuitesFromCases } from './statsUtils';
import type {
  ReportData,
  ResultSummary,
  TestCase as TestCaseModel,
  TestError,
  TestRun as TestRunModel,
  TestSuite,
} from './types/report';

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

/**
 * Resolves user options and defaults into a complete `ReporterConfig` object.
 *
 * @param rawConfig - Optional raw configuration options from Playwright config.
 * @param cwd - Current working directory (defaults to process.cwd()).
 * @returns Fully resolved reporter configuration.
 */
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
   * Copies test result attachments to output directory and formats attachment models.
   *
   * @param testId - Playwright test ID.
   * @param rawAttachments - List of raw Playwright attachments.
   * @returns Formatted list of attachments, or undefined if empty.
   */
  private processAttachments(
    testId: string,
    rawAttachments: TestResult['attachments']
  ): TestCaseModel['attachments'] {
    if (!rawAttachments || rawAttachments.length === 0) return undefined;

    const cwd = process.cwd();
    const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
    const outputDir = path.resolve(normalizedCwd, this.reportConfig.outputDir);
    const attachmentsDir = path.join(outputDir, 'attachments');

    const result = rawAttachments.map((att, attIdx) => {
      let finalPath: string | null = att.path || null;

      const isText =
        att.contentType?.startsWith('text/') ||
        /\.(txt|log|json|csv|html|xml|md|yaml|yml|js|ts|jsx|tsx|css)$/i.test(
          att.name || att.path || ''
        );

      if (att.path && fs.existsSync(att.path)) {
        try {
          fs.mkdirSync(attachmentsDir, { recursive: true });
          const safeName = path.basename(att.path).replace(/[^a-zA-Z0-9._-]/g, '_');
          const safeTestId = testId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const targetFilename = `${safeTestId}_att${attIdx}_${safeName}`;
          const targetPath = path.join(attachmentsDir, targetFilename);
          fs.copyFileSync(att.path, targetPath);
          finalPath = `./attachments/${targetFilename}`;
        } catch (e) {
          console.error(`Failed to copy attachment file from ${att.path}:`, e);
        }
      } else if (att.body) {
        try {
          fs.mkdirSync(attachmentsDir, { recursive: true });

          let ext = '.bin';
          if (att.contentType === 'image/png') ext = '.png';
          else if (att.contentType === 'image/jpeg') ext = '.jpg';
          else if (att.contentType === 'text/plain') ext = '.txt';
          else if (att.contentType === 'text/html' || att.name?.endsWith('.html')) ext = '.html';
          else if (att.contentType === 'application/json' || att.name?.endsWith('.json'))
            ext = '.json';
          else if (isText) ext = '.txt';

          const safeTestId = testId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const targetFilename = `${safeTestId}_att${attIdx}${ext}`;
          const targetPath = path.join(attachmentsDir, targetFilename);
          const buf = Buffer.isBuffer(att.body) ? att.body : Buffer.from(att.body);

          fs.writeFileSync(targetPath, buf);
          finalPath = `./attachments/${targetFilename}`;
        } catch (e) {
          console.error('Failed to write in-memory attachment to disk:', e);
        }
      }

      let bodyContent: string | null = null;
      if (att.body) {
        if (isText) {
          bodyContent = Buffer.isBuffer(att.body) ? att.body.toString('utf8') : String(att.body);
        } else {
          bodyContent = Buffer.isBuffer(att.body) ? att.body.toString('base64') : String(att.body);
        }
      } else if (isText && att.path && fs.existsSync(att.path)) {
        try {
          // Embed text attachment content in body so file:// previews work offline & without CORS blocks
          bodyContent = fs.readFileSync(att.path, 'utf8');
        } catch (e) {
          console.error(`Failed to read text attachment file from ${att.path}:`, e);
        }
      }

      return {
        name: att.name,
        contentType: att.contentType,
        path: finalPath,
        body: bodyContent,
      };
    });

    return result.length > 0 ? result : undefined;
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
   * Computes high-level result summary statistics for the completed test run.
   *
   * @param endTime - ISO timestamp of completion.
   * @param wallClockDuration - Total wall clock duration in milliseconds.
   * @returns ResultSummary metrics object.
   */
  private computeResultSummary(endTime: string, wallClockDuration: number): ResultSummary {
    const passed = this.testCases.filter((tc) => tc.status === 'passed').length;
    const failed = this.testCases.filter((tc) => tc.status === 'failed').length;
    const skipped = this.testCases.filter((tc) => tc.status === 'skipped').length;
    const timedOut = this.testCases.filter((tc) => tc.status === 'timedOut').length;
    const interrupted = this.testCases.filter((tc) => tc.status === 'interrupted').length;
    const numberOfProjects = this.config.projects.length;
    const totalSequentialDuration = this.testCases.reduce((sum, tc) => sum + (tc.duration || 0), 0);

    return {
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
  }

  /** Executes history CLI subcommand to update history data files and HTML embeddings. */
  private refreshHistory(): void {
    try {
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
      console.warn('History refresh skipped (keeping existing history data).');
    }
  }

  /**
   * Generates `index.html` (and optional `summary.html`) from template assets and JSON payloads.
   *
   * @param outputDir - Target output directory path.
   * @param reportData - Complete report data model payload.
   */
  private generateHtmlReport(outputDir: string, reportData: ReportData): void {
    try {
      const pm = this.reportConfig.packageManager;
      const moduleFile =
        typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
      const moduleDir = path.dirname(moduleFile);
      const packageRoot =
        moduleDir.endsWith(path.join('src', 'lib')) || moduleDir.endsWith('src/lib')
          ? path.resolve(moduleDir, '..', '..')
          : path.resolve(moduleDir, '..');

      const templatePath = path.join(packageRoot, 'dist', 'index.html');
      let templateContent: string | null = null;

      if (fs.existsSync(templatePath)) {
        try {
          templateContent = fs.readFileSync(templatePath, 'utf8');
        } catch {
          /* ignore */
        }
      }

      if (!templateContent) {
        const buildCmd = getViteBuildCommand(pm, packageRoot);
        execSync(buildCmd, {
          cwd: packageRoot,
          stdio: 'pipe',
          env: { ...process.env, PW_REPORTER_OUTPUT: outputDir },
        });

        if (fs.existsSync(templatePath)) {
          try {
            templateContent = fs.readFileSync(templatePath, 'utf8');
          } catch {
            /* ignore */
          }
        }
      }

      if (templateContent) {
        const safeData = JSON.stringify(reportData).replace(/</g, '\\u003c');
        const dataScript = `<script id="report-data" type="application/json">${safeData}</script>`;

        const cleanTemplate = templateContent.replace(
          /<script id="report-data" type="application\/json">[\s\S]*?<\/script>/,
          ''
        );
        let finalHtml = cleanTemplate.replace('</head>', `${dataScript}\n</head>`);

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
        `Running total ${allTests.length} tests, ${workerStr}\n\nLegend: . passed | F failed | ± flaky | s skipped\n`
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

    const attemptStdout = (result.stdout || []).map((entry) =>
      typeof entry === 'string' ? entry : entry.toString('utf8')
    );
    const attemptStderr = (result.stderr || []).map((entry) =>
      typeof entry === 'string' ? entry : entry.toString('utf8')
    );

    const attemptAttachments = this.processAttachments(test.id, result.attachments);
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
        stdout: attemptStdout.length > 0 ? attemptStdout : undefined,
        stderr: attemptStderr.length > 0 ? attemptStderr : undefined,
        attachments: attemptAttachments,
      });
    }

    testCase.steps = attemptSteps;
    testCase.stdout = attemptStdout.length > 0 ? attemptStdout : undefined;
    testCase.stderr = attemptStderr.length > 0 ? attemptStderr : undefined;

    const status = testCase.status;
    const projStr =
      testCase.project && testCase.project !== 'unknown' ? `[${testCase.project}] ` : '';
    const shortName = `${projStr}${testCase.fileName} › ${testCase.title}`;

    if (status === 'failed' || status === 'timedOut' || status === 'interrupted') {
      this.progressPrinter.clearLineProgress();
      const durationStr = testCase.duration > 0 ? ` (${testCase.duration}ms)` : '';
      console.log(`❌ [FAILED] ${shortName}${durationStr}`);
    }

    let dotStatus: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky' = status;

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
  onEnd(result: FullResult): void {
    this.progressPrinter.clearLineProgress();

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

    if (this.reportConfig.enableHistory !== false) {
      writeRunHistory({
        startTime: this.startTime,
        testRunName: this.reportConfig.testRunName,
        projectName: this.reportConfig.projectName,
        shard: this.config?.shard,
        outputDir: this.reportConfig.outputDir,
        summary,
        endedAt: endTime,
        testCases: this.testCases,
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

    this.generateHtmlReport(outputDir, reportData);
  }
}

/**
 * Helper to construct the terminal command string for opening the generated report.
 *
 * @param pm - Optional package manager name (defaults to auto-detection).
 * @param cwd - Current working directory.
 * @returns Command string (e.g., `npx zr show` or `pnpm zr show`).
 */
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
