#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { getViteBuildCommand, processRawData } from '../src/lib/dataProcessor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(ROOT, process.env.PW_REPORTER_OUTPUT || 'zen-report');

function readRawData(): unknown {
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

function convertPlaywrightSuites(raw: { suites: unknown[] }): unknown {
  const tests: unknown[] = [];
  function extractTests(suites: unknown[], describePath: string[] = []) {
    for (const suite of suites) {
      if (!suite || typeof suite !== 'object') continue;
      const s = suite as Record<string, unknown>;
      const title = typeof s.title === 'string' ? s.title : '';

      const isDescribe = Boolean(s.suites && !s.file && title);
      const nextDescribePath = isDescribe ? [...describePath, title] : describePath;

      if (Array.isArray(s.tests)) {
        for (const t of s.tests as unknown[]) {
          const test = t as Record<string, unknown>;
          if (
            test.status &&
            ['passed', 'failed', 'skipped', 'timedOut'].includes(test.status as string)
          ) {
            tests.push({
              ...test,
              describePath: nextDescribePath,
            });
          }
        }
      }
      if (Array.isArray(s.suites)) extractTests(s.suites, nextDescribePath);
    }
  }

  extractTests(raw.suites);

  if (tests.length > 0) return { tests };

  throw new Error('Could not extract test data from Playwright report format.');
}

try {
  const rawData = readRawData() as Record<string, unknown>;
  // If it's already processed, it will have testRun
  let reportData: unknown = rawData;

  if (!rawData.testRun) {
    reportData = processRawData(rawData);
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(resolve(REPORT_DIR, 'report.json'), JSON.stringify(reportData, null, 2), 'utf8');
    console.debug(`✓ Wrote processed data → ${resolve(REPORT_DIR, 'report.json')}`);
  }

  console.log('→ Preparing test report...');
  const buildCmd = getViteBuildCommand(process.env.PACKAGE_MANAGER, ROOT);
  try {
    execSync(buildCmd, { cwd: ROOT, stdio: 'pipe' });
  } catch (error: unknown) {
    const execErr = error as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const stdout = execErr.stdout ? execErr.stdout.toString() : '';
    const stderr = execErr.stderr ? execErr.stderr.toString() : '';
    const output = [stdout, stderr].filter(Boolean).join('\n');
    throw new Error(`Vite build failed:\n${output || execErr.message || String(error)}`, {
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
