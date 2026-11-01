import { expect, test } from '@playwright/test';
import { getOsName, getPlaywrightVersion, getZenReporterVersion } from '../bin/commands/system.js';

test.describe('System Diagnostics & Shared Utilities Tests', () => {
  test('getOsName returns a non-empty string', () => {
    const osName = getOsName();
    expect(typeof osName).toBe('string');
    expect(osName.length).toBeGreaterThan(0);
  });

  test('getPlaywrightVersion detects installed @playwright/test package', () => {
    const version = getPlaywrightVersion();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('getPlaywrightVersion returns undefined for non-existent path', () => {
    const version = getPlaywrightVersion('/non/existent/path');
    expect(version).toBeUndefined();
  });

  test('getZenReporterVersion returns valid semver version from package.json', () => {
    const version = getZenReporterVersion();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
