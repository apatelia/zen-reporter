import { expect, test } from '@playwright/test';
import { resolveConfig } from '../packages/reporter/src/lib/reporter';

test.describe('Zen Reporter Configuration Tests', () => {
  test('resolves default config values when options are omitted', () => {
    const config = resolveConfig();
    expect(config.outputDir).toBe('zen-report');
    expect(config.projectName).toBe('Test Automation Project');
    expect(config.theme).toBe('Sage');
    expect(config.darkMode).toBe('system');
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
    expect(config.theme).toBe('Sage');
    expect(config.darkMode).toBe('system');
  });

  test('resolves custom theme and darkMode configuration options', () => {
    const config = resolveConfig({
      theme: 'Oasis',
      darkMode: true,
    });
    expect(config.theme).toBe('Oasis');
    expect(config.darkMode).toBe('dark');

    // 'system' is the default and is preserved as-is
    const systemConfig = resolveConfig({
      theme: 'Oasis',
      darkMode: 'system',
    });
    expect(systemConfig.darkMode).toBe('system');

    // Legacy boolean false forces light mode
    const lightConfig = resolveConfig({
      theme: 'Oasis',
      darkMode: false,
    });
    expect(lightConfig.darkMode).toBe('light');

    // Legacy or invalid theme names fall back to default Sage theme and record configWarnings
    const legacyConfig = resolveConfig({
      theme: 'Streak',
    });
    expect(legacyConfig.theme).toBe('Sage');
    expect(legacyConfig.configWarnings).toEqual([
      'Unknown theme "Streak". Falling back to default "Sage" theme.',
    ]);
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

  test('resolves openAutomatically configuration option', () => {
    const defaultConfig = resolveConfig();
    expect(defaultConfig.openAutomatically).toBe('never');

    const alwaysConfig = resolveConfig({ openAutomatically: 'always' });
    expect(alwaysConfig.openAutomatically).toBe('always');

    const failureOnlyConfig = resolveConfig({ openAutomatically: 'on-failure-only' });
    expect(failureOnlyConfig.openAutomatically).toBe('on-failure-only');

    const neverConfig = resolveConfig({ openAutomatically: 'never' });
    expect(neverConfig.openAutomatically).toBe('never');

    // Invalid or unknown values fallback to 'never'
    const invalidConfig = resolveConfig({ openAutomatically: 'invalid' });
    expect(invalidConfig.openAutomatically).toBe('never');
  });

  test('resolves history configuration options correctly', () => {
    // Boolean true/false
    const trueConfig = resolveConfig({ history: true });
    expect(trueConfig.enableHistory).toBe(true);
    expect(trueConfig.history).toBe(true);

    const falseConfig = resolveConfig({ history: false });
    expect(falseConfig.enableHistory).toBe(false);
    expect(falseConfig.history).toBe(false);

    // Local mode
    const localConfig = resolveConfig({
      history: { mode: 'local', windowSize: 100, maxRuns: 500 },
    });
    expect(localConfig.enableHistory).toBe(true);
    expect(localConfig.history).toEqual({ mode: 'local', windowSize: 100, maxRuns: 500 });

    // Remote mode
    const remoteConfig = resolveConfig({
      history: {
        mode: 'remote',
        serverUrl: 'http://localhost:3000',
        apiKey: 'secret-key',
        projectId: 'my-project',
      },
    });
    expect(remoteConfig.enableHistory).toBe(true);
    expect(remoteConfig.history).toEqual({
      mode: 'remote',
      serverUrl: 'http://localhost:3000',
      apiKey: 'secret-key',
      projectId: 'my-project',
    });

    // Disabled mode
    const offConfig = resolveConfig({
      history: { mode: 'off' },
    });
    expect(offConfig.enableHistory).toBe(false);
    expect(offConfig.history).toEqual({ mode: 'off' });
  });

  test('validates and falls back with warnings for invalid config values', () => {
    const config = resolveConfig({
      outputDir: '   ',
      projectName: '',
      testRunName: '',
      singleSummaryFile: 'false' as unknown as boolean,
      minimalReport: 'true' as unknown as boolean,
      history: { mode: 'remote' } as unknown as boolean,
    });

    expect(config.outputDir).toBe('zen-report');
    expect(config.projectName).toBe('Test Automation Project');
    expect(config.testRunName).toMatch(/^Test Run #\d+$/);
    expect(config.rawTestRunName).toBeUndefined();
    expect(config.singleSummaryFile).toBe(false);
    expect(config.minimalReport).toBe(false);
    expect(config.enableHistory).toBe(true);
    expect(config.history).toBeUndefined(); // falls back to local history

    expect(config.configWarnings).toEqual([
      'Invalid outputDir "   ". Falling back to default "zen-report".',
      'Invalid projectName "". Falling back to default "Test Automation Project".',
      'Invalid testRunName "". Falling back to default "Test Run #{N}".',
      'Invalid singleSummaryFile "false" (expected boolean). Falling back to false.',
      'Invalid minimalReport "true" (expected boolean). Falling back to false.',
      'Invalid history configuration for remote mode (missing or empty "serverUrl"). Falling back to local history.',
    ]);
  });

  test('warns on unknown or misspelled configuration keys with suggestions', () => {
    const config = resolveConfig({
      thme: 'Sage',
      outDir: 'custom',
      unknownProp: 123,
    });

    expect(config.configWarnings).toContain(
      'Unknown configuration key "thme". Did you mean "theme"?'
    );
    expect(config.configWarnings).toContain(
      'Unknown configuration key "outDir". Did you mean "outputDir"?'
    );
    expect(config.configWarnings).toContain('Unknown configuration key "unknownProp".');
  });
});
