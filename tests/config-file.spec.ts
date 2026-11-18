/* eslint-disable no-empty-pattern */
import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { resolveConfig } from '../packages/reporter-playwright/src/lib/reporter';

test.describe('zen.config.json Discovery & Loading', () => {
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
