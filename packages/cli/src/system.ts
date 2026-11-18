import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { platform, release, type, version } from 'os';
import { resolve } from 'path';

/**
 * Returns OS friendly name for system diagnostic output and report metadata.
 *
 * @returns Operating system name (e.g. 'macOS 23.6.0', 'Windows 10 Pro', 'Ubuntu 24.04 LTS').
 */
export function getOsName(): string {
  const p = platform();

  if (p === 'darwin') return `macOS ${release()}`;
  if (p === 'win32') return `${version()}`;
  if (p === 'linux') {
    try {
      if (existsSync('/etc/os-release')) {
        const content = readFileSync('/etc/os-release', 'utf8');
        const match = content.match(/^PRETTY_NAME="?([^"\n]+)"?/m);

        if (match && match[1]) return match[1];
      }
    } catch {
      /* ignore */
    }

    return 'Linux';
  }

  return type();
}

/**
 * Detects installed @playwright/test package version in the project.
 *
 * @param cwd - Project directory path.
 * @returns Installed Playwright version string or undefined if not installed.
 */
export function getPlaywrightVersion(cwd: string = process.cwd()): string | undefined {
  try {
    const req = createRequire(resolve(cwd, 'package.json'));
    const pwPkg = req('@playwright/test/package.json');

    return pwPkg.version || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Detects installed package version of the CLI or reporter.
 *
 * @returns Package version string or 'unknown'.
 */
export function getZenReporterVersion(): string {
  const req = createRequire(import.meta.url);

  try {
    const pkg = req('../package.json');

    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}
