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
import { fileURLToPath } from 'url';
import { detectPackageManager, getViteBuildCommand } from './dataProcessor';
import type {
  ReportData,
  ResultSummary,
  TestCase as TestCaseModel,
  TestError,
  TestRun as TestRunModel,
  TestSuite,
} from './types';
import { buildSuitesFromCases, convertPlaywrightSteps, sanitizeAnsi, setFsModule } from './utils';

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
  const singleSummaryFile = Boolean(rawConfig?.singleSummaryFile);

  return {
    outputDir,
    packageManager,
    projectName,
    testRunName,
    singleSummaryFile,
  };
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

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.reportConfig = resolveConfig(
      this.options ||
        (config as FullConfig & { reporterConfig?: Record<string, unknown> }).reporterConfig
    );
    this.startTime = new Date().toISOString();
    this.testCaseMap.clear();
    this.testCases = [];

    for (const test of suite.allTests()) {
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
  }

  onEnd(result: FullResult): void {
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

    // Generate the single-file HTML report by injecting report.json data into pre-built template
    try {
      const pm = this.reportConfig.packageManager;
      const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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
        const finalHtml = cleanTemplate.replace('</head>', `${dataScript}\n</head>`);

        const destHtml = path.join(outputDir, 'index.html');
        fs.writeFileSync(destHtml, finalHtml, 'utf8');
        console.log(`\n✓ Report generated: ${destHtml}`);
        console.log(`\n💡 Run "${getShowReportCommand(pm)}" to view the report\n`);

        if (this.reportConfig.singleSummaryFile) {
          const summaryHtmlPath = path.join(outputDir, 'summary.html');
          const summaryScript = `<script>window.__ZEN_SUMMARY_ONLY__ = true;</script>`;
          const summaryHtml = cleanTemplate.replace(
            '</head>',
            `${dataScript}\n${summaryScript}\n</head>`
          );
          fs.writeFileSync(summaryHtmlPath, summaryHtml, 'utf8');
          console.log(`✓ Standalone Summary generated: ${summaryHtmlPath}`);
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
      return 'pnpm zen-reporter show (or pnpm zr show)';
    case 'yarn':
      return 'yarn zen-reporter show (or yarn zr show)';
    case 'bun':
      return 'bunx zen-reporter show (or bunx zr show)';
    default:
      return 'npx zen-reporter show (or npx zr show)';
  }
}

export default ZenReporter;
