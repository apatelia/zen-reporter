/**
 * Returns OS friendly name for system diagnostic output and report metadata.
 */
export function getOsName(): string;

/**
 * Detects installed @playwright/test package version in the project.
 */
export function getPlaywrightVersion(cwd?: string): string | undefined;

/**
 * Detects installed zen-reporter package version.
 */
export function getZenReporterVersion(): string;
