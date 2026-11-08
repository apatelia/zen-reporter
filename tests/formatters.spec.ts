import { expect, test } from '@playwright/test';
import { normalizeErrorText, sha256Sync } from '@arpanp/zen-core';
import { truncateMiddlePath } from '@arpanp/zen-core';

test.describe('Formatters & Windows Path Tests', () => {
  test('truncateMiddlePath truncates POSIX paths with > 3 segments', () => {
    expect(truncateMiddlePath('src/components/shared/Button.tsx')).toBe('src/.../Button.tsx');
    expect(truncateMiddlePath('/usr/local/share/app/main.ts')).toBe('/usr/.../main.ts');
  });

  test('truncateMiddlePath preserves short POSIX paths', () => {
    expect(truncateMiddlePath('')).toBe('');
    expect(truncateMiddlePath('foo.ts')).toBe('foo.ts');
    expect(truncateMiddlePath('src/foo.ts')).toBe('src/foo.ts');
  });

  test('truncateMiddlePath handles Windows backslash paths correctly', () => {
    expect(truncateMiddlePath('C:\\Users\\arpan\\project\\tests\\foo.spec.ts')).toBe(
      'C:\\...\\foo.spec.ts'
    );
    expect(truncateMiddlePath('tests\\nested\\deep\\bar.spec.ts')).toBe('tests\\...\\bar.spec.ts');
    expect(truncateMiddlePath('tests\\bar.spec.ts')).toBe('tests\\bar.spec.ts');
  });
});

test.describe('CryptoUtils Performance Optimizations Tests', () => {
  test('normalizeErrorText masks dynamic tokens with hoisted regexes', () => {
    const rawMsg =
      'Error at 2026-11-01T12:00:00.000Z: failed connecting to localhost:3000 with uuid 12345678-1234-1234-1234-123456789abc after 250ms at ptr 0xdeadbeef at :10:20';
    const rawStack = 'Error: failed\n    at test.spec.ts:15:30\n    at internal/process.js:5:10';

    const normalized = normalizeErrorText(rawMsg, rawStack);
    expect(normalized).toContain('<TIMESTAMP>');
    expect(normalized).toContain('<HOST>');
    expect(normalized).toContain('<UUID>');
    expect(normalized).toContain('<DURATION>');
    expect(normalized).toContain('<PTR>');
    expect(normalized).toContain(':<LINE>:<COL>');
  });

  test('sha256Sync produces correct deterministic hashes with hoisted constants', () => {
    expect(sha256Sync('hello world')).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    );
    expect(sha256Sync('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

test.describe('Range Selection Parser Tests', () => {
  test('parses single numbers, lists, ranges and "all"', async () => {
    const { parseRangeSelection } = await import('../packages/reporter/bin/commands/history.js');

    expect(parseRangeSelection('', 10)).toEqual([]);
    expect(parseRangeSelection('all', 5)).toEqual([1, 2, 3, 4, 5]);
    expect(parseRangeSelection('1', 5)).toEqual([1]);
    expect(parseRangeSelection('1, 3, 5', 10)).toEqual([1, 3, 5]);
    expect(parseRangeSelection('2-4', 10)).toEqual([2, 3, 4]);
    expect(parseRangeSelection('2-4, 8, 12-14', 20)).toEqual([2, 3, 4, 8, 12, 13, 14]);
    // Deduplication and ordering
    expect(parseRangeSelection('5, 2-4, 3, 5-6', 10)).toEqual([2, 3, 4, 5, 6]);
    // Out of bounds / invalid inputs return empty
    expect(parseRangeSelection('0', 10)).toEqual([]);
    expect(parseRangeSelection('15', 10)).toEqual([]);
    expect(parseRangeSelection('5-12', 10)).toEqual([]);
    expect(parseRangeSelection('abc', 10)).toEqual([]);
    expect(parseRangeSelection('1-2-3', 10)).toEqual([]);
  });
});
