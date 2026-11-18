import { getOsName, getPlaywrightVersion, getZenReporterVersion } from './common.js';

/**
 * Prints system environment diagnostics including node, package manager, and OS versions.
 *
 * @param {string} [cwd=process.cwd()] - Current working directory.
 */
export function handleEnv(cwd = process.cwd()) {
  console.log(`zen-reporter version: ${getZenReporterVersion()}`);
  console.log(`@playwright/test version: ${getPlaywrightVersion(cwd)}`);
  console.log(`Node.js version: ${process.version}`);
  console.log(`OS: ${getOsName()}`);
}
