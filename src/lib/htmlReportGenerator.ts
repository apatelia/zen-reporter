import { execFileSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { detectPackageManager } from './dataProcessor';
import type { ReportData, ResultSummary, TestSuite } from '@arpanp/zen-core';

/**
 * Configuration options needed for HTML report generation.
 */
export interface HtmlReportOptions {
  outputDir: string;
  packageManager: string;
  enableHistory: 'auto' | boolean;
  singleSummaryFile?: boolean;
  openAutomatically: 'always' | 'never' | 'on-failure-only';
}

/**
 * Finds the absolute path to `bin/zen-reporter.js` by checking current and parent directories.
 *
 * @returns Absolute path to `bin/zen-reporter.js`, or `null` if not found.
 */
export function findBinPath(): string | null {
  const moduleFile =
    typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
  let dir = path.dirname(moduleFile);

  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, 'bin', 'zen-reporter.js');
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;

    dir = parent;
  }

  return null;
}

/**
 * Executes history CLI subcommand to update history data files and HTML embeddings.
 *
 * @param outputDir - Report output directory path.
 * @returns Void.
 */
export function refreshHistory(outputDir: string): void {
  try {
    const binPath = findBinPath();
    if (!binPath) return;

    execFileSync(process.execPath, [binPath, 'history', 'report'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, PW_REPORTER_OUTPUT: outputDir },
    });
  } catch {
    console.warn('History refresh skipped (keeping existing history data).');
  }
}

/**
 * Automatically opens the generated report using `zr show` if configured.
 *
 * @param options - HTML report options.
 * @param summary - Result summary containing passed/failed/timedOut/interrupted counts.
 * @returns Boolean indicating whether the report was opened automatically.
 */
export function maybeOpenReport(options: HtmlReportOptions, summary: ResultSummary): boolean {
  const mode = options.openAutomatically;
  if (mode === 'never') return false;

  const hasFailure =
    (summary.failed || 0) > 0 || (summary.timedOut || 0) > 0 || (summary.interrupted || 0) > 0;

  if (mode === 'on-failure-only' && !hasFailure) {
    return false;
  }

  const binPath = findBinPath();
  if (!binPath) return false;

  try {
    const child = spawn(process.execPath, [binPath, 'show'], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PW_REPORTER_OUTPUT: options.outputDir },
    });
    child.unref();
    return true;
  } catch {
    return false;
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

/**
 * Recursively strips granular execution data (steps, sub-steps, attachments, logs, errors)
 * from suites and cases, preserving only high-level properties necessary for Overview calculations.
 *
 * @param suite - TestSuite to prune.
 * @returns Pruned TestSuite.
 */
export function pruneSuiteForSummary(suite: TestSuite): TestSuite {
  return {
    title: suite.title,
    cases: (suite.cases || []).map((c) => ({
      title: c.title,
      parent: c.parent,
      project: c.project,
      fileName: c.fileName,
      status: c.status,
      duration: c.duration,
      attempts: c.attempts,
      ...(c.failedAttempts && c.failedAttempts.length > 0
        ? {
            failedAttempts: c.failedAttempts.map((f) => ({
              status: f.status,
              duration: f.duration,
              error: null,
            })),
          }
        : {}),
    })),
    ...(suite.subSuites && suite.subSuites.length > 0
      ? {
          subSuites: suite.subSuites.map(pruneSuiteForSummary),
        }
      : {}),
  };
}

/**
 * Creates a lightweight copy of ReportData containing only metadata and pruned suites
 * for embedding into summary.html.
 *
 * @param reportData - Complete report data model payload.
 * @returns Pruned ReportData.
 */
export function pruneReportDataForSummary(reportData: ReportData): ReportData {
  return {
    testRun: {
      ...reportData.testRun,
      suites: (reportData.testRun.suites || []).map(pruneSuiteForSummary),
    },
  };
}

/**
 * Generates `index.html` (and optional `summary.html`) from template assets and JSON payloads.
 *
 * @param outputDir - Target output directory path.
 * @param reportData - Complete report data model payload.
 * @param summary - Result summary containing passed/failed/timedOut/interrupted counts.
 * @param options - HTML report options.
 * @returns Void.
 */
export function generateHtmlReport(
  outputDir: string,
  reportData: ReportData,
  summary: ResultSummary,
  options: HtmlReportOptions
): void {
  try {
    const pm = options.packageManager;
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
      console.error(
        `Zen Reporter template not found at "${templatePath}". Ensure the package is properly built.`
      );
      return;
    }

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

    console.log(`\n✓ Report generated: ${destHtml}`);

    const openedAutomatically = maybeOpenReport(options, summary);
    if (openedAutomatically) {
      console.log('\n✓ Report opened automatically in your web browser as per configuration.\n');
    } else {
      console.log(`\n💡 Run "${getShowReportCommand(pm)}" to view the report in web browser.\n`);
    }

    if (options.enableHistory !== false) {
      refreshHistory(options.outputDir);

      const dbPath = path.join(outputDir, 'history.db');
      const runsDir = path.join(outputDir, 'runs');
      if (fs.existsSync(dbPath) && fs.existsSync(runsDir)) {
        try {
          const jsonlFiles = fs.readdirSync(runsDir).filter((f) => f.endsWith('.jsonl'));
          if (jsonlFiles.length > 0) {
            console.log(
              `\x1b[33m💡\x1b[0m Note: Zen Reporter is now using SQLite (${path.relative(process.cwd(), dbPath) || dbPath}) for historical data. Legacy JSONL files in "${path.relative(process.cwd(), runsDir) || runsDir}" can be safely removed, or run "${getShowReportCommand(pm).replace('show', 'history migrate --clean')}".\n`
            );
          }
        } catch {
          /* ignore error reading runsDir */
        }
      }
    }

    if (options.singleSummaryFile) {
      const summaryJsonPath = path.join(outputDir, 'summary.json');
      const summaryHtmlPath = path.join(outputDir, 'summary.html');
      const prunedSummaryData = pruneReportDataForSummary(reportData);
      fs.writeFileSync(summaryJsonPath, JSON.stringify(prunedSummaryData, null, 2), 'utf8');

      const safeSummaryData = JSON.stringify(prunedSummaryData).replace(/</g, '\\u003c');
      const summaryDataScript = `<script id="report-data" type="application/json">${safeSummaryData}</script>`;
      const summaryScript = `<script>window.__ZEN_SUMMARY_ONLY__ = true;</script>`;
      const summaryHtml = cleanTemplate.replace(
        '</head>',
        `${summaryDataScript}\n${summaryScript}\n</head>`
      );

      fs.writeFileSync(summaryHtmlPath, summaryHtml, 'utf8');
      console.log(`✓ Standalone Summary generated: ${summaryHtmlPath}`);
    }
  } catch (err) {
    console.error('Report generation failed, keeping report.json:', err);
  }
}
