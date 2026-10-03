/**
 * Unified UI Theme Tokens & Status Color Palette Maps.
 * Single source of truth for health status indicators, card styling, and chart colors.
 */

export type SummaryCardColor = 'success' | 'danger' | 'warning' | 'info';

export const TEST_STATUS_COLOR_MAP: Record<string, string> = {
  Passed: 'var(--color-success-500)',
  Failed: 'var(--color-danger-500)',
  Interrupted: 'var(--color-danger-600)',
  Skipped: 'var(--color-text-muted)',
  'Timed Out': 'var(--color-warning-500)',
  passed: 'var(--color-success-500)',
  failed: 'var(--color-danger-500)',
  interrupted: 'var(--color-danger-600)',
  skipped: 'var(--color-text-muted)',
  timedOut: 'var(--color-warning-500)',
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

export const SUMMARY_CARD_THEME: Record<
  SummaryCardColor,
  { bg: string; text: string; progressBg: string }
> = {
  success: {
    bg: 'bg-success-50 border-success-200 dark:bg-success-50/20 dark:border-success-500/30',
    text: 'text-success-600 dark:text-success-500',
    progressBg: 'bg-success-500',
  },
  danger: {
    bg: 'bg-danger-50 border-danger-200 dark:bg-danger-50/20 dark:border-danger-500/30',
    text: 'text-danger-600 dark:text-danger-500',
    progressBg: 'bg-danger-500',
  },
  warning: {
    bg: 'bg-warning-50 border-warning-200 dark:bg-warning-50/20 dark:border-warning-500/30',
    text: 'text-warning-500 dark:text-warning-500',
    progressBg: 'bg-warning-500',
  },
  info: {
    bg: 'bg-info-50 border-info-200 dark:bg-info-50/20 dark:border-info-500/30',
    text: 'text-info-600 dark:text-info-500',
    progressBg: 'bg-info-500',
  },
};
