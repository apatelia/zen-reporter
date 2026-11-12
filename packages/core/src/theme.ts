/**
 * Unified UI Theme Tokens & Status Color Palette Maps.
 * Single source of truth for health status indicators, card styling, and chart colors.
 */
export const TEST_STATUS_COLOR_MAP: Record<string, string> = {
  Passed: 'var(--color-status-chart-passed)',
  Flaky: 'var(--color-status-chart-flaky)',
  Failed: 'var(--color-status-chart-failed)',
  Interrupted: 'var(--color-status-chart-interrupted)',
  Skipped: 'var(--color-status-chart-skipped)',
  'Timed Out': 'var(--color-status-chart-timed-out)',
  passed: 'var(--color-status-chart-passed)',
  flaky: 'var(--color-status-chart-flaky)',
  failed: 'var(--color-status-chart-failed)',
  interrupted: 'var(--color-status-chart-interrupted)',
  skipped: 'var(--color-status-chart-skipped)',
  timedOut: 'var(--color-status-chart-timed-out)',
};

export const HEALTH_CATEGORY_CONFIG = {
  excellent: {
    color: 'var(--color-success-500)',
    bgLight: 'bg-success-100/80',
    bgDark: 'dark:bg-success-50/20',
    dotLight: 'bg-success-500',
    dotDark: 'dark:bg-success-500',
    textLight: 'text-success-600',
    textDark: 'dark:text-success-500',
    badgeStyle: 'bg-success-500/10 text-success-600 dark:text-success-500 border-success-500/20',
    label: 'Excellent',
    range: '≥ 90%',
    borderLight: 'border-success-300/70',
    borderDark: 'dark:border-success-800/40',
    active: (passRate: number) => passRate >= 90,
  },
  warning: {
    color: 'var(--color-warning-500)',
    bgLight: 'bg-warning-100/80',
    bgDark: 'dark:bg-warning-50/20',
    dotLight: 'bg-warning-500',
    dotDark: 'dark:bg-warning-500',
    textLight: 'text-warning-600',
    textDark: 'dark:text-warning-500',
    badgeStyle: 'bg-warning-500/10 text-warning-600 dark:text-warning-500 border-warning-500/20',
    label: 'Needs Improvement',
    range: '60% – 89%',
    borderLight: 'border-warning-300/70',
    borderDark: 'dark:border-warning-800/40',
    active: (passRate: number) => passRate >= 60 && passRate < 90,
  },
  critical: {
    color: 'var(--color-danger-500)',
    bgLight: 'bg-danger-100/80',
    bgDark: 'dark:bg-danger-50/20',
    dotLight: 'bg-danger-500',
    dotDark: 'dark:bg-danger-500',
    textLight: 'text-danger-600',
    textDark: 'dark:text-danger-500',
    badgeStyle: 'bg-danger-500/10 text-danger-600 dark:text-danger-500 border-danger-500/20',
    label: 'Critical',
    range: '< 60%',
    borderLight: 'border-danger-300/70',
    borderDark: 'dark:border-danger-800/40',
    active: (passRate: number) => passRate < 60,
  },
} as const;

export type StatusType = 'passed' | 'flaky' | 'failed' | 'timedOut' | 'interrupted' | 'skipped';

export const STATUS_BADGE_STYLE_MAP: Record<StatusType, string> = {
  passed:
    'bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400 dark:ring-1 dark:ring-success-500/30',
  flaky:
    'bg-warning-50 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400 dark:ring-1 dark:ring-warning-500/30',
  failed:
    'bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400 dark:ring-1 dark:ring-danger-500/30',
  timedOut:
    'bg-warning-50 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400 dark:ring-1 dark:ring-warning-500/30',
  interrupted:
    'bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400 dark:ring-1 dark:ring-danger-500/30',
  skipped:
    'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-1 dark:ring-slate-600',
};

/**
 * Curated palette of project identity colors.
 *
 * Every token resolves to a unique value in every theme scope
 * (Sage/Lotus/Oasis × light/dark), verified against `app.css`. Tokens span
 * distinct hue groups (green, dark green, orange, amber, pink, red, brown,
 * blue) so up to 10 projects stay visually distinguishable in any theme
 * and mode.
 */
export const DISTINCT_PROJECT_COLORS = [
  'var(--color-accent-green)',
  'var(--color-accent-orange)',
  'var(--color-accent-gold)',
  'var(--color-accent-pink)',
  'var(--color-danger-700)',
  'var(--color-info-500)',
  'var(--color-info-600)',
  'var(--color-info-700)',
  'var(--color-warning-600)',
  'var(--color-success-700)',
];

/**
 * Assigns each project a unique identity color from `DISTINCT_PROJECT_COLORS`.
 *
 * Projects are processed in first-appearance order and each receives the
 * first unused palette color; when more projects exist than palette entries,
 * the palette wraps around.
 *
 * @param projects - Playwright project names in first-appearance order.
 * @returns Map of project name to CSS color variable token.
 */
export function buildProjectColorMap(projects: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  let index = 0;
  for (const project of projects) {
    if (map[project]) continue;
    map[project] = DISTINCT_PROJECT_COLORS[index++ % DISTINCT_PROJECT_COLORS.length];
  }
  return map;
}

/**
 * Normalizes a raw `darkMode` value into the canonical tri-state.
 *
 * Accepts legacy boolean values (`true`/`false`) as well as the canonical
 * strings (`'system'`, `'light'`, `'dark'`) and falls back to `'system'`
 * for any unrecognized input.
 *
 * @param value - Raw value from report data or user config, or `undefined`.
 * @returns The canonical dark mode state (`'system' | 'light' | 'dark'`).
 */
export function parseDarkMode(value: unknown): 'system' | 'light' | 'dark' {
  if (value === true || value === 'dark') return 'dark';
  if (value === false || value === 'light') return 'light';
  return 'system';
}

/**
 * Normalizes a raw theme name into the canonical theme title.
 *
 * Accepts canonical names (`'Sage'`, `'Lotus'`, `'Oasis'`) in any case, plus
 * legacy aliases (`'Cafe'`, `'Sentinel'`, `'Streak'`) kept for backwards
 * compatibility with older reports and configurations.
 *
 * @param value - Raw theme name from report data, user config, or localStorage, or `undefined`.
 * @returns The canonical theme title (`'Sage' | 'Lotus' | 'Oasis'`), or `null` when unrecognized.
 */
export function normalizeTheme(
  value: string | null | undefined
): 'Sage' | 'Lotus' | 'Oasis' | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === 'sage' || lower === 'cafe') return 'Sage';
  if (lower === 'lotus' || lower === 'sentinel') return 'Lotus';
  if (lower === 'oasis' || lower === 'streak') return 'Oasis';
  return null;
}
