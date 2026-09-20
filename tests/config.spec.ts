import { expect, test } from '@playwright/test';
import { resolveConfig } from '../src/lib/reporter';

test.describe('Zen Reporter Configuration Tests', () => {
  test('resolves default config values when options are omitted', () => {
    const config = resolveConfig();
    expect(config.outputDir).toBe('zen-report');
    expect(config.projectName).toBe('Test Automation Project');
    expect(config.testRunName).toBe('Test Run #1');
    expect(config.theme).toBe('Starbucks');
    expect(config.darkMode).toBe(false);
  });

  test('resolves custom projectName and testRunName configuration options', () => {
    const config = resolveConfig({
      outputDir: 'custom-output',
      projectName: 'My E2E Project',
      testRunName: 'Nightly Run #42',
    });
    expect(config.outputDir).toBe('custom-output');
    expect(config.projectName).toBe('My E2E Project');
    expect(config.testRunName).toBe('Nightly Run #42');
    expect(config.theme).toBe('Starbucks');
    expect(config.darkMode).toBe(false);
  });

  test('resolves custom theme and darkMode configuration options', () => {
    const config = resolveConfig({
      theme: 'Notion',
      darkMode: true,
    });
    expect(config.theme).toBe('Notion');
    expect(config.darkMode).toBe(true);
  });
});
