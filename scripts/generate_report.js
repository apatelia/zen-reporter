#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(ROOT, process.env.PW_REPORTER_OUTPUT || 'zen-report');

/**
 * Detects the package manager used in the target directory based on lockfiles or package.json.
 *
 * @param {string} [cwd=process.cwd()] - Directory to check.
 * @returns {string} Detected package manager ('pnpm', 'yarn', 'bun', or 'npm').
 */
function detectPackageManager(cwd = process.cwd()) {
  const lockfiles = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['package-lock.json', 'npm'],
  ];

  for (const [file, manager] of lockfiles) {
    if (existsSync(resolve(cwd, file))) return manager;
  }

  if (existsSync(resolve(cwd, '.npmrc'))) return 'npm';

  try {
    const pkgPath = resolve(cwd, 'package.json');

    if (existsSync(pkgPath)) {
      const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));

      if (pkgJson.packageManager) return pkgJson.packageManager.split('@')[0];
    }
  } catch {
    /* ignore */
  }

  return 'npm';
}

/**
 * Reads raw test execution result data from `report.json` or fallback Playwright `result.json`.
 *
 * @returns {object} Parsed raw report data object.
 * @throws {Error} If no valid test data source file is found.
 */
function readRawData() {
  const reportJson = resolve(REPORT_DIR, 'report.json');

  if (existsSync(reportJson)) {
    return JSON.parse(readFileSync(reportJson, 'utf8'));
  }

  const testResults = resolve(ROOT, 'test-results');

  if (existsSync(testResults)) {
    const resultJson = resolve(testResults, 'result.json');

    if (existsSync(resultJson)) {
      const raw = JSON.parse(readFileSync(resultJson, 'utf8'));

      if (raw && Array.isArray(raw.suites)) {
        return convertPlaywrightSuites(raw);
      }
    }
  }

  throw new Error('Could not find test data in report.json or test-results/result.json');
}

/**
 * Helper to recursively extract test cases from Playwright suite objects.
 *
 * @param {object[]} suites - Suite objects array.
 * @param {string[]} [describePath=[]] - Accumulated describe headers path.
 * @param {object[]} [tests=[]] - Output extracted test objects array.
 */
function extractTests(suites, describePath = [], tests = []) {
  for (const suite of suites) {
    if (!suite || typeof suite !== 'object') continue;

    const title = typeof suite.title === 'string' ? suite.title : '';
    const isDescribe = Boolean(suite.suites && !suite.file && title);
    const nextDescribePath = isDescribe ? [...describePath, title] : describePath;

    if (Array.isArray(suite.tests)) {
      for (const test of suite.tests) {
        if (test.status && ['passed', 'failed', 'skipped', 'timedOut'].includes(test.status)) {
          tests.push({
            ...test,
            describePath: nextDescribePath,
          });
        }
      }
    }

    if (Array.isArray(suite.suites)) extractTests(suite.suites, nextDescribePath, tests);
  }
}

/**
 * Converts raw Playwright JSON reporter suites structure into flat test objects.
 *
 * @param {object} raw - Raw Playwright suite output structure.
 * @returns {{ tests: object[] }} Object containing extracted test cases.
 * @throws {Error} If no tests can be extracted from raw structure.
 */
function convertPlaywrightSuites(raw) {
  const tests = [];
  extractTests(raw.suites, [], tests);

  if (tests.length > 0) return { tests };

  throw new Error('Could not extract test data from Playwright report format.');
}

try {
  const rawData = readRawData();
  let reportData = rawData;
  let templateContent = null;

  if (!rawData.testRun) {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(resolve(REPORT_DIR, 'report.json'), JSON.stringify(reportData, null, 2), 'utf8');

    console.debug(`✓ Wrote processed data → ${resolve(REPORT_DIR, 'report.json')}`);
  }

  console.log('→ Preparing test report...');

  const templatePath = resolve(ROOT, 'dist', 'index.html');

  if (existsSync(templatePath)) {
    try {
      templateContent = readFileSync(templatePath, 'utf8');
    } catch {
      /* ignore */
    }
  }

  if (!templateContent) {
    const isWin = process.platform === 'win32';
    const bin = (name) => (isWin ? `${name}.cmd` : name);
    const pm = detectPackageManager(ROOT);

    let command;
    let args;

    switch (pm) {
      case 'pnpm':
        command = bin('pnpm');
        args = ['exec', 'vite', 'build'];
        break;
      case 'yarn':
        command = bin('yarn');
        args = ['exec', 'vite', 'build'];
        break;
      case 'bun':
        command = bin('bun');
        args = ['x', 'vite', 'build'];
        break;
      default:
        command = bin('npx');
        args = ['vite', 'build'];
        break;
    }

    try {
      execFileSync(command, args, { cwd: ROOT, stdio: 'pipe' });
    } catch (error) {
      const stdout = error?.stdout ? error.stdout.toString() : '';
      const stderr = error?.stderr ? error.stderr.toString() : '';
      const output = [stdout, stderr].filter(Boolean).join('\n');

      throw new Error(`Vite build failed:\n${output || error?.message || String(error)}`, {
        cause: error,
      });
    }

    if (existsSync(templatePath)) {
      try {
        templateContent = readFileSync(templatePath, 'utf8');
      } catch {
        /* ignore */
      }
    }
  }

  if (templateContent) {
    const reportHtml = resolve(REPORT_DIR, 'index.html');
    mkdirSync(REPORT_DIR, { recursive: true });

    const reportFile = resolve(REPORT_DIR, 'report.json');
    let safeReport = '';

    if (existsSync(reportFile)) {
      safeReport = readFileSync(reportFile, 'utf8').replace(/</g, '\\u003c');
    } else {
      safeReport = JSON.stringify(reportData).replace(/</g, '\\u003c');
    }

    const dataScript = `<script id="report-data" type="application/json">${safeReport}</script>`;
    const cleanTemplate = templateContent.replace(
      /<script id="report-data" type="application\/json">[\s\S]*?<\/script>/,
      ''
    );

    // Embed the run-history payload inline so history/trends work even when the
    // report is opened directly over file:// (where the app's fetch fallback is
    // skipped). history.json lives next to report.json in the same OUTPUT dir.
    const historyFile = resolve(REPORT_DIR, 'history.json');
    let historyScript = '';

    if (existsSync(historyFile)) {
      const safeHistory = readFileSync(historyFile, 'utf8').replace(/</g, '\\u003c');
      historyScript = `<script id="history-data" type="application/json">${safeHistory}</script>`;
    } else {
      console.debug('→ No history.json found; history/trends will be unavailable.');
    }

    const finalHtml = cleanTemplate.replace('</head>', `${dataScript}\n${historyScript}\n</head>`);
    writeFileSync(reportHtml, finalHtml, 'utf8');

    console.log('✓ Report generation complete!');
  } else {
    throw new Error('Could not find or build HTML template.');
  }
} catch (err) {
  console.error('✗ Report generation failed:', err);
  process.exit(1);
}
