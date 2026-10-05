import { expect, test } from '@playwright/test';
import {
  formatDateSlug,
  formatTimeHHMM,
  generateExportFilename,
  slugify,
} from '../src/lib/exportFilename';

test.describe('Dynamic CSV Export Filename Tests', () => {
  const fixedDate = new Date('2026-10-05T14:30:00.000Z');

  test('slugify cleans illegal path characters and normalizes spaces', () => {
    expect(slugify('Flaky Tests / Regressions! & More?')).toBe('flaky-tests-regressions-more');
    expect(slugify('  Test: Title * Special <Chars>  ')).toBe('test-title-special-chars');
  });

  test('formatDateSlug and formatTimeHHMM format correctly', () => {
    expect(formatDateSlug(fixedDate)).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(formatTimeHHMM(fixedDate)).toMatch(/\d{4}/);
  });

  test('generateExportFilename without filters includes dataset, date, and time HHmm', () => {
    const filename = generateExportFilename('Flaky Tests', undefined, fixedDate);
    expect(filename).toMatch(/^flaky-tests_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
  });

  test('generateExportFilename with preset date filter (e.g. Last 30 Days)', () => {
    const filename = generateExportFilename(
      'Flaky Tests',
      {
        dateRange: {
          fromTimestamp: 1700000000000,
          toTimestamp: 1702500000000,
          label: 'Last 30 Days',
        },
      },
      fixedDate
    );
    expect(filename).toMatch(/^flaky-tests_last-30-days_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
  });

  test('generateExportFilename with single month date range', () => {
    const startOct = new Date(2026, 9, 1).getTime(); // Oct 1 2026
    const endOct = new Date(2026, 9, 31, 23, 59, 59).getTime(); // Oct 31 2026

    const filename = generateExportFilename(
      'Flaky Tests',
      {
        dateRange: {
          fromTimestamp: startOct,
          toTimestamp: endOct,
          label: null,
        },
      },
      fixedDate
    );
    expect(filename).toMatch(/^flaky-tests_october-2026_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
  });

  test('generateExportFilename with custom multi-month date range', () => {
    const startAug = new Date('2026-08-01T00:00:00.000Z').getTime();
    const endOct = new Date('2026-10-05T00:00:00.000Z').getTime();

    const filename = generateExportFilename(
      'Flaky Tests',
      {
        dateRange: {
          fromTimestamp: startAug,
          toTimestamp: endOct,
          label: null,
        },
      },
      fixedDate
    );
    expect(filename).toMatch(
      /^flaky-tests_\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/
    );
  });

  test('generateExportFilename with search term filter', () => {
    const filename = generateExportFilename(
      'Flaky Tests',
      {
        searchTerm: 'auth login modal',
      },
      fixedDate
    );
    expect(filename).toMatch(/^flaky-tests_search-auth-login-modal_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
  });

  test('generateExportFilename with custom date range label formatted as DD/MM/YYYY to DD/MM/YYYY', () => {
    const filename = generateExportFilename(
      'Flaky Tests',
      {
        dateRange: {
          fromTimestamp: new Date('2026-08-01T00:00:00.000Z').getTime(),
          toTimestamp: new Date('2026-10-05T00:00:00.000Z').getTime(),
          label: '01/08/2026 to 05/10/2026',
        },
      },
      fixedDate
    );
    expect(filename).toMatch(/^flaky-tests_2026-08-01-to-2026-10-05_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
  });

  test('generateExportFilename with combined search and preset filter', () => {
    const filename = generateExportFilename(
      'Test Runs History',
      {
        dateRange: {
          fromTimestamp: 1700000000000,
          toTimestamp: 1702500000000,
          label: 'Last 30 Days',
        },
        searchTerm: 'login',
      },
      fixedDate
    );
    expect(filename).toMatch(
      /^test-runs-history_last-30-days_search-login_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/
    );
  });
});
