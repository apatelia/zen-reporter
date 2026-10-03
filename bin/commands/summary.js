import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { formatDuration, padCenter } from './common.js';

/**
 * Recursively collects failed test cases from a suite hierarchy array into an output array.
 *
 * @param {object[]} suites - Suite hierarchy array.
 * @param {object[]} [failedCases=[]] - Output array accumulating failed test case objects.
 */
function collectFailedCases(suites, failedCases = []) {
  if (!suites || !Array.isArray(suites)) return failedCases;
  for (const suite of suites) {
    if (suite.cases && Array.isArray(suite.cases)) {
      for (const tc of suite.cases) {
        if (tc.status === 'failed' || tc.status === 'timedOut' || tc.status === 'interrupted') {
          failedCases.push(tc);
        }
      }
    }
    if (suite.subSuites) {
      collectFailedCases(suite.subSuites, failedCases);
    }
  }
  return failedCases;
}

/**
 * Generates a GitHub-flavored Markdown summary string from processed report data.
 *
 * @param {object} reportData - The JSON report data object.
 * @returns {string} Formatted Markdown summary text.
 */
export function generateMarkdownSummaryFromReport(reportData) {
  const testRun = reportData.testRun || {};
  const summary = testRun.summary || {};
  const total = summary.total || 0;
  const passed = summary.passed || 0;
  const failed = summary.failed || 0;
  const timedOut = summary.timedOut || 0;
  const skipped = summary.skipped || 0;
  const interrupted = summary.interrupted || 0;
  const hasFailures = failed > 0 || timedOut > 0 || interrupted > 0;
  const statusStr = hasFailures ? '❌ FAILED' : '✅ PASSED';
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1).replace(/\.0$/, '') : '0';
  const durationStr = formatDuration(summary.duration || 0);

  const titleProject = testRun.projectName || 'Test Automation Project';
  const titleRun = testRun.testRunName || 'Test Run';

  let md = `\n### 📊 Test Run Summary: ${titleProject} — ${titleRun}\n\n`;
  md += `**Status:** ${statusStr}\n`;
  md += `**Duration:** ${durationStr}\n`;
  md += `**Pass Rate:** ${passRate}%\n\n`;

  const headers = ['Total', 'Passed', 'Failed', 'Timed Out', 'Skipped'];
  const values = [String(total), String(passed), String(failed), String(timedOut), String(skipped)];

  if (interrupted > 0) {
    headers.push('Interrupted');
    values.push(String(interrupted));
  }

  const widths = headers.map((h, i) => Math.max(h.length, values[i].length, 3));
  const headerRow = `| ${headers.map((h, i) => padCenter(h, widths[i])).join(' | ')} |`;
  const sepRow = `| ${widths.map((w) => ':' + '-'.repeat(w - 2) + ':').join(' | ')} |`;
  const valueRow = `| ${values.map((v, i) => padCenter(v, widths[i])).join(' | ')} |`;

  md += `${headerRow}\n${sepRow}\n${valueRow}\n`;

  const failedCases = collectFailedCases(testRun.suites);

  if (failedCases.length > 0) {
    md += `\n#### ❌ Failed Tests (${failedCases.length})\n`;

    const limit = 15;
    const displayed = failedCases.slice(0, limit);

    for (const tc of displayed) {
      const projectStr = tc.project && tc.project !== 'unknown' ? `**[${tc.project}]** ` : '';
      const fileStr = tc.fileName ? `\`${tc.fileName}\` › ` : '';

      md += `- ${projectStr}${fileStr}${tc.title}\n`;
    }

    if (failedCases.length > limit) {
      md += `- ... and ${failedCases.length - limit} more failed tests\n`;
    }
  }

  return md;
}

/**
 * Handles the `zr summary` command by reading `report.json` and printing a Markdown summary.
 *
 * @param {string} [cwd=process.cwd()] - Current working directory.
 */
export function handleSummary(cwd = process.cwd()) {
  const outputDir = process.env.PW_REPORTER_OUTPUT || 'zen-report';
  const reportJsonPath = resolve(cwd, outputDir, 'report.json');

  if (!existsSync(reportJsonPath)) {
    console.error(`✗ Report file not found at "${outputDir}/report.json".`);
    console.error(`  Make sure you have run your Playwright tests first.`);

    process.exit(1);
  }

  try {
    const rawData = readFileSync(reportJsonPath, 'utf8');
    const reportData = JSON.parse(rawData);
    const summaryMd = generateMarkdownSummaryFromReport(reportData);

    console.log(summaryMd);
  } catch (err) {
    console.error('✗ Failed to read report summary:', err.message || err);

    process.exit(1);
  }
}
