/* eslint-disable no-empty-pattern */
import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseSync } from 'node:sqlite';
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

  test('replaces {N} placeholder with dynamic run number based on existing runs', ({}, testInfo) => {
    const tempOutputDir = testInfo.outputPath('temp-test-runs-dir');
    const runsDir = path.join(tempOutputDir, 'runs');

    try {
      fs.mkdirSync(runsDir, { recursive: true });

      // 0 existing runs -> run #1
      const config1 = resolveConfig(
        { outputDir: tempOutputDir, testRunName: 'Build #{N}' },
        process.cwd()
      );
      expect(config1.testRunName).toBe('Build #1');

      // Create dummy run files
      fs.writeFileSync(path.join(runsDir, 'run-1.jsonl'), '{}');
      fs.writeFileSync(path.join(runsDir, 'run-2.jsonl'), '{}');

      // 2 existing runs -> run #3
      const config3 = resolveConfig(
        { outputDir: tempOutputDir, testRunName: 'Run {N}' },
        process.cwd()
      );
      expect(config3.testRunName).toBe('Run 3');

      // Default testRunName pattern should also use dynamic run number
      const configDefault = resolveConfig({ outputDir: tempOutputDir }, process.cwd());
      expect(configDefault.testRunName).toBe('Test Run #3');

      // Test SQLite history.db counting
      const dbPath = path.join(tempOutputDir, 'history.db');
      const db = new DatabaseSync(dbPath);
      db.exec('CREATE TABLE history_runs (run_id TEXT PRIMARY KEY);');
      db.prepare('INSERT INTO history_runs (run_id) VALUES (?);').run('run-1');
      db.prepare('INSERT INTO history_runs (run_id) VALUES (?);').run('run-2');
      db.prepare('INSERT INTO history_runs (run_id) VALUES (?);').run('run-3');
      db.prepare('INSERT INTO history_runs (run_id) VALUES (?);').run('run-4');
      db.close();

      const configSqlite = resolveConfig(
        {
          outputDir: tempOutputDir,
          testRunName: 'Execution #{N}',
        },
        process.cwd()
      );
      expect(configSqlite.testRunName).toBe('Execution #5');
    } finally {
      if (fs.existsSync(tempOutputDir)) {
        fs.rmSync(tempOutputDir, { recursive: true, force: true });
      }
    }
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

    // Verify backwards compatibility for legacy theme names
    const legacyConfig = resolveConfig({
      theme: 'Streak',
    });
    expect(legacyConfig.theme).toBe('Oasis');
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

  test('auto-discovers zen.config.json next to the Playwright config', ({}, testInfo) => {
    const configDir = testInfo.outputPath('zen-config-dir');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'zen.config.json'),
      JSON.stringify({
        projectName: 'File Configured Project',
        theme: 'Lotus',
        singleSummaryFile: true,
      })
    );

    try {
      const config = resolveConfig(undefined, process.cwd(), configDir);
      expect(config.projectName).toBe('File Configured Project');
      expect(config.theme).toBe('Lotus');
      expect(config.singleSummaryFile).toBe(true);
      // Options absent from the file keep built-in defaults
      expect(config.outputDir).toBe('zen-report');
      expect(config.darkMode).toBe('system');
    } finally {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });

  test('inline options override zen.config.json values field by field', ({}, testInfo) => {
    const configDir = testInfo.outputPath('zen-config-override-dir');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'zen.config.json'),
      JSON.stringify({
        projectName: 'From File',
        theme: 'Lotus',
      })
    );

    try {
      const config = resolveConfig({ theme: 'Oasis' }, process.cwd(), configDir);
      expect(config.projectName).toBe('From File'); // from the file
      expect(config.theme).toBe('Oasis'); // inline wins
    } finally {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });

  test('throws a clear error when zen.config.json is malformed', ({}, testInfo) => {
    const configDir = testInfo.outputPath('zen-config-malformed-dir');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'zen.config.json'), '{ "projectName": ');

    try {
      expect(() => resolveConfig(undefined, process.cwd(), configDir)).toThrow(/zen\.config\.json/);
    } finally {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });

  test('throws when zen.config.json is not a plain object', ({}, testInfo) => {
    const configDir = testInfo.outputPath('zen-config-array-dir');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'zen.config.json'), '[1, 2, 3]');

    try {
      expect(() => resolveConfig(undefined, process.cwd(), configDir)).toThrow(/plain object/);
    } finally {
      fs.rmSync(configDir, { recursive: true, force: true });
    }
  });
});
