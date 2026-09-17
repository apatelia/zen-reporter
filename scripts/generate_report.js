#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(ROOT, process.env.PW_REPORTER_OUTPUT || 'zen-report');

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

function getViteBuildCommand(pm, cwd = process.cwd()) {
  const manager = pm || detectPackageManager(cwd);
  switch (manager) {
    case 'pnpm':
      return 'pnpm exec vite build';
    case 'yarn':
      return 'yarn exec vite build';
    case 'bun':
      return 'bunx vite build';
    default:
      return 'npx vite build';
  }
}

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

function convertPlaywrightSuites(raw) {
  const tests = [];
  function extractTests(suites, describePath = []) {
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
      if (Array.isArray(suite.suites)) extractTests(suite.suites, nextDescribePath);
    }
  }

  extractTests(raw.suites);

  if (tests.length > 0) return { tests };

  throw new Error('Could not extract test data from Playwright report format.');
}

try {
  const rawData = readRawData();
  let reportData = rawData;

  if (!rawData.testRun) {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(resolve(REPORT_DIR, 'report.json'), JSON.stringify(reportData, null, 2), 'utf8');
    console.debug(`✓ Wrote processed data → ${resolve(REPORT_DIR, 'report.json')}`);
  }

  console.log('→ Preparing test report...');
  const buildCmd = getViteBuildCommand(undefined, ROOT);
  try {
    execSync(buildCmd, { cwd: ROOT, stdio: 'pipe' });
  } catch (error) {
    const stdout = error?.stdout ? error.stdout.toString() : '';
    const stderr = error?.stderr ? error.stderr.toString() : '';
    const output = [stdout, stderr].filter(Boolean).join('\n');
    throw new Error(`Vite build failed:\n${output || error?.message || String(error)}`, {
      cause: error,
    });
  }

  const distHtml = resolve(ROOT, 'dist', 'index.html');
  const reportHtml = resolve(REPORT_DIR, 'index.html');

  if (existsSync(distHtml)) {
    mkdirSync(REPORT_DIR, { recursive: true });
    const html = readFileSync(distHtml, 'utf8');
    writeFileSync(reportHtml, html, 'utf8');
  }

  console.log('✓ Report generation complete!');
} catch (err) {
  console.error('✗ Report generation failed:', err);
  process.exit(1);
}
