#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function detectPackageManager(cwd: string = process.cwd()): string {
  const lockfiles: [string, string][] = [
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

const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || 'show';

if (command === 'show') {
  const outputDir = process.env.PW_REPORTER_OUTPUT || 'zen-report';
  const reportPath = resolve(cwd, outputDir, 'index.html');

  if (!existsSync(reportPath)) {
    console.error(`✗ Report file not found at "${outputDir}/index.html".`);
    console.error(`  Make sure you have run your Playwright tests first.`);
    process.exit(1);
  }

  const pm = detectPackageManager(cwd);
  const showCmd =
    pm === 'pnpm'
      ? `pnpm exec playwright show-report ${outputDir}`
      : pm === 'yarn'
        ? `yarn exec playwright show-report ${outputDir}`
        : pm === 'bun'
          ? `bunx playwright show-report ${outputDir}`
          : `npx playwright show-report ${outputDir}`;

  try {
    execSync(showCmd, { cwd, stdio: 'inherit' });
  } catch (err: unknown) {
    const execErr = err as { status?: number; message?: string };
    if (execErr.status !== 130 && execErr.status !== 0) {
      console.error('✗ Failed to launch report server:', execErr.message || err);
    }
  }
} else {
  console.log(`
Zen Reporter CLI

Usage:
  npx zen-reporter show    Serve and view the HTML report
`);
}
