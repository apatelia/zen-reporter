import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { platform, release, type, version } from 'os';
import { resolve } from 'path';

/**
 * Returns OS friendly name for system diagnostic output and report metadata.
 *
 * @returns {string} Operating system name (e.g. 'macOS 23.6.0', 'Windows 10 Pro', 'Ubuntu 24.04 LTS').
 */
export function getOsName() {
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
 * @param {string} [cwd=process.cwd()] - Project directory path.
 * @returns {string|undefined} Installed Playwright version string or undefined if not installed.
 */
export function getPlaywrightVersion(cwd = process.cwd()) {
  try {
    const req = createRequire(resolve(cwd, 'package.json'));
    const pwPkg = req('@playwright/test/package.json');

    return pwPkg.version || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Detects installed zen-reporter package version.
 *
 * @returns {string} Package version string or 'unknown'.
 */
export function getZenReporterVersion() {
  const req = createRequire(import.meta.url);

  try {
    const pkg = req('../../package.json');

    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}
