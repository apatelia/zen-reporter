import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ReportData, TestSuite } from '@arpanp/zen-core';

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
 * Re-injects or rewrites index.html (and optional summary.html) with updated ReportData.
 *
 * @param outputDir - Report directory containing index.html.
 * @param reportData - Updated report data model payload.
 * @returns boolean indicating success.
 */
export function updateReportHtmlFiles(outputDir: string, reportData: ReportData): boolean {
  try {
    const moduleFile =
      typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
    const moduleDir = path.dirname(moduleFile);
    const packageRoot =
      moduleDir.endsWith(path.join('src')) || moduleDir.endsWith('src')
        ? path.resolve(moduleDir, '..')
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
      const existingIndexPath = path.join(outputDir, 'index.html');
      if (fs.existsSync(existingIndexPath)) {
        templateContent = fs.readFileSync(existingIndexPath, 'utf8');
      }
    }

    if (!templateContent) {
      return false;
    }

    const safeData = JSON.stringify(reportData).replace(/</g, '\\u003c');
    const dataScript = `<script id="report-data" type="application/json">${safeData}</script>`;

    const cleanTemplate = templateContent
      .replace(/<script id="report-data" type="application\/json">[\s\S]*?<\/script>/, '')
      .replace(/<script id="history-data" type="application\/json">[\s\S]*?<\/script>/, '');

    const finalHtml = cleanTemplate.replace('</head>', `${dataScript}\n</head>`);
    const destHtml = path.join(outputDir, 'index.html');
    fs.writeFileSync(destHtml, finalHtml, 'utf8');

    // Also update report.json if present
    const reportJsonPath = path.join(outputDir, 'report.json');
    if (fs.existsSync(reportJsonPath)) {
      fs.writeFileSync(reportJsonPath, JSON.stringify(reportData, null, 2), 'utf8');
    }

    // Also update summary.html / summary.json if present
    const summaryHtmlPath = path.join(outputDir, 'summary.html');
    const summaryJsonPath = path.join(outputDir, 'summary.json');
    if (fs.existsSync(summaryHtmlPath) || fs.existsSync(summaryJsonPath)) {
      const prunedSummaryData = pruneReportDataForSummary(reportData);
      if (fs.existsSync(summaryJsonPath)) {
        fs.writeFileSync(summaryJsonPath, JSON.stringify(prunedSummaryData, null, 2), 'utf8');
      }
      if (fs.existsSync(summaryHtmlPath)) {
        const safeSummaryData = JSON.stringify(prunedSummaryData).replace(/</g, '\\u003c');
        const summaryDataScript = `<script id="report-data" type="application/json">${safeSummaryData}</script>`;
        const summaryScript = `<script>window.__ZEN_SUMMARY_ONLY__ = true;</script>`;
        const summaryHtml = cleanTemplate.replace(
          '</head>',
          `${summaryDataScript}\n${summaryScript}\n</head>`
        );
        fs.writeFileSync(summaryHtmlPath, summaryHtml, 'utf8');
      }
    }

    return true;
  } catch (err) {
    console.warn('Failed to update report HTML files:', err);
    return false;
  }
}
