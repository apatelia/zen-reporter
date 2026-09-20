import { useMemo } from 'react';

interface Props {
  passRate: number;
}

const categoryConfig = {
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

const categories = [
  categoryConfig.excellent,
  categoryConfig.warning,
  categoryConfig.critical,
] as const;

function isCategoryActive(cat: (typeof categories)[number], passRate: number) {
  return cat.active(passRate);
}

// Ring dimensions — 120px diameter
const SIZE = 120;
const RADIUS = 46;
const STROKE_WIDTH = 8;
const VIEWBOX = SIZE;
const CENTER = VIEWBOX / 2;
const circumference = 2 * Math.PI * RADIUS;

export default function PassRateRing({ passRate }: Props) {
  const activeCategory = categories.find((c) => c.active(passRate))!;

  const dashOffset = useMemo(() => circumference - (passRate / 100) * circumference, [passRate]);

  return (
    <div className="flex flex-col justify-between w-full h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
            Overall Pass Rate
          </h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${activeCategory.badgeStyle}`}
          >
            {activeCategory.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted text-left">
          Percentage of passed test cases across all suites
        </p>
      </div>

      {/* Ring */}
      <div className="relative my-2 flex flex-col items-center justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          {/* Background ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--color-border-default)"
            strokeWidth={STROKE_WIDTH}
          />
          {/* Progress ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={activeCategory.color}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-ink dark:text-text-on-primary">
            {Math.round(passRate)}%
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Pass Rate
          </span>
        </div>
      </div>

      {/* Category indicators */}
      <div className="mt-auto flex w-full flex-col gap-y-1">
        {categories.map((cat) => {
          const isActive = isCategoryActive(cat, passRate);
          return (
            <div
              key={cat.label}
              className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 transition-colors duration-300 ${
                isActive
                  ? `${cat.borderLight} ${cat.borderDark} ${cat.bgLight} ${cat.bgDark}`
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-center">
                <span
                  className={`mr-2 inline-block h-2 w-2 rounded-full ${cat.dotLight} ${cat.dotDark}`}
                />
                <span className={`text-xs font-medium ${cat.textLight} ${cat.textDark}`}>
                  {cat.label}
                </span>
              </div>
              <span className="text-xs text-text-body-mid dark:text-text-muted">{cat.range}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
