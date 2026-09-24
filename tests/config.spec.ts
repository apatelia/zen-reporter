import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from '@playwright/test';
import { resolveConfig } from '../src/lib/reporter';

test.describe('Zen Reporter Configuration Tests', () => {
  test('resolves default config values when options are omitted', () => {
    const config = resolveConfig();
    expect(config.outputDir).toBe('zen-report');
    expect(config.projectName).toBe('Test Automation Project');
    expect(config.theme).toBe('Cafe');
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
    expect(config.theme).toBe('Cafe');
    expect(config.darkMode).toBe(false);
  });

  test('replaces {N} placeholder with dynamic run number based on existing runs', () => {
    const tempOutputDir = path.join(process.cwd(), 'temp-test-runs-dir');
    const runsDir = path.join(tempOutputDir, 'runs');

    try {
      fs.mkdirSync(runsDir, { recursive: true });

      // 0 existing runs -> run #1
      const config1 = resolveConfig({ outputDir: 'temp-test-runs-dir', testRunName: 'Build #{N}' });
      expect(config1.testRunName).toBe('Build #1');

      // Create dummy run files
      fs.writeFileSync(path.join(runsDir, 'run-1.jsonl'), '{}');
      fs.writeFileSync(path.join(runsDir, 'run-2.jsonl'), '{}');

      // 2 existing runs -> run #3
      const config3 = resolveConfig({ outputDir: 'temp-test-runs-dir', testRunName: 'Run {N}' });
      expect(config3.testRunName).toBe('Run 3');

      // Default testRunName pattern should also use dynamic run number
      const configDefault = resolveConfig({ outputDir: 'temp-test-runs-dir' });
      expect(configDefault.testRunName).toBe('Test Run #3');
    } finally {
      if (fs.existsSync(tempOutputDir)) {
        fs.rmSync(tempOutputDir, { recursive: true, force: true });
      }
    }
  });

  test('resolves custom theme and darkMode configuration options', () => {
    const config = resolveConfig({
      theme: 'Concept',
      darkMode: true,
    });
    expect(config.theme).toBe('Concept');
    expect(config.darkMode).toBe(true);
  });

  test('resolves minimalReport option and forces enableHistory to false when enabled', () => {
    const defaultConfig = resolveConfig();
    expect(defaultConfig.minimalReport).toBe(false);
    expect(defaultConfig.enableHistory).toBe('auto');

    const minimalConfig = resolveConfig({
      minimalReport: true,
      enableHistory: true, // Should be overridden to false by minimalReport
    });
    expect(minimalConfig.minimalReport).toBe(true);
    expect(minimalConfig.enableHistory).toBe(false);
  });
});
