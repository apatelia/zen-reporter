import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { detectPackageManager } from './dataProcessor';
import type {
  ReportData,
  ResultSummary,
  TestCase as TestCaseModel,
  TestError,
  TestRun as TestRunModel,
  TestSuite,
} from './types';
import { buildSuitesFromCases, convertPlaywrightSteps, sanitizeAnsi } from './utils';

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
  const testRunName = rawConfig?.testRunName ? String(rawConfig.testRunName) : 'Test Run #1';

  return { outputDir, packageManager, projectName, testRunName };
}

class ZenReporter implements Reporter {
  private config!: FullConfig;
  private reportConfig!: ReporterConfig;
  private testCaseMap = new Map<string, TestCaseModel>();
  private startTime = '';
  private testCases: TestCaseModel[] = [];
  private options?: Record<string, unknown>;

  constructor(options?: Record<string, unknown>) {
    this.options = options;
  }

  private buildSuites(): TestSuite[] {
    return buildSuitesFromCases(this.testCases);
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.reportConfig = resolveConfig(
      this.options ||
        (config as FullConfig & { reporterConfig?: Record<string, unknown> }).reporterConfig
    );
    this.startTime = new Date().toISOString();
    this.testCaseMap.clear();
    this.testCases = [];
  }

  onTestBegin(test: TestCase, _result: TestResult): void {
    const existing = this.testCaseMap.get(test.id);
    if (existing) {
      // Retried attempt: keep prior attempt data and just bump the counter.
      existing.attempts = (existing.attempts ?? 0) + 1;
      return;
    }
    const fileName = test.parent.location?.file.replace(process.cwd(), '') || 'unknown file';

    const testCase: TestCaseModel = {
      title: test.title,
      parent: test.parent.title,
      project: test.parent.project()?.name || 'unknown',
      fileName: fileName,
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
      attempts: 1,
      failedAttempts: [],
    };

    testCase.tags?.push(testCase.project);

    this.testCaseMap.set(test.id, testCase);
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
      result.steps && result.steps.length > 0 ? convertPlaywrightSteps(result.steps) : undefined;
    const stepDurationSum = attemptSteps
      ? attemptSteps.reduce((sum, step) => sum + (step.duration || 0), 0)
      : 0;
    const attemptDuration = stepDurationSum > 0 ? stepDurationSum : result.duration;

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
    const attemptAttachments = (result.attachments || []).map((att) => {
      let bodyData: Buffer | string | null = att.body || null;
      if (!bodyData && att.path && fs.existsSync(att.path)) {
        try {
          bodyData = fs.readFileSync(att.path).toString('base64');
        } catch (e) {
          console.error(`Failed to read attachment file at ${att.path}:`, e);
        }
      }
      return {
        name: att.name,
        contentType: att.contentType,
        path: att.path || null,
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
  }

  onEnd(_result: FullResult): void {
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
      numberOfProjects,
      workers: this.config?.workers,
    };

    const suites = this.buildSuites();

    const testRun: TestRunModel = {
      summary,
      suites,
      projectName: this.reportConfig.projectName,
      testRunName: this.reportConfig.testRunName,
    };

    const reportData: ReportData = { testRun };

    const cwd = process.cwd();
    const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
    const outputDir = path.resolve(normalizedCwd, this.reportConfig.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });

    const jsonPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), 'utf8');

    // Generate the single-file HTML report
    try {
      const pm = this.reportConfig.packageManager;
      const buildCmd =
        pm === 'pnpm'
          ? 'pnpm exec tsx ../zen-reporter/scripts/generate_report.ts'
          : pm === 'yarn'
            ? 'yarn exec tsx ../zen-reporter/scripts/generate_report.ts'
            : pm === 'bun'
              ? 'bunx tsx ../zen-reporter/scripts/generate_report.ts'
              : 'npx tsx ../zen-reporter/scripts/generate_report.ts';

      const reportRoot = path.resolve(normalizedCwd, '..', 'zen-reporter');
      execSync(buildCmd, {
        cwd: reportRoot,
        stdio: 'inherit',
        env: { ...process.env, PW_REPORTER_OUTPUT: this.reportConfig.outputDir },
      });

      // Copy generated HTML to output directory
      const srcHtml = path.join(reportRoot, this.reportConfig.outputDir, 'index.html');
      const destHtml = path.join(outputDir, 'index.html');
      if (fs.existsSync(srcHtml)) {
        fs.copyFileSync(srcHtml, destHtml);
        console.log(`\n✓ Report generated: ${destHtml}`);
        console.log(`\n💡 Run "${getShowReportCommand(pm)}" to view the report`);
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
      return 'pnpm zen-reporter show';
    case 'yarn':
      return 'yarn zen-reporter show';
    case 'bun':
      return 'bunx zen-reporter show';
    default:
      return 'npx zen-reporter show';
  }
}

export default ZenReporter;
