import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { detectPackageManager } from './common.js';

/**
 * Serves and displays the generated HTML report using Playwright's built-in viewer CLI.
 *
 * @param {string} [cwd=process.cwd()] - Current working directory.
 */
export function handleShow(cwd = process.cwd()) {
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
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'status' in err &&
      err.status !== 130 &&
      err.status !== 0
    ) {
      console.error('✗ Failed to launch report server:', err.message || err);
    }
  }
}
