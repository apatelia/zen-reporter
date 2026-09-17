import { useMemo } from 'react';

interface Props {
  passRate: number;
}

const categoryConfig = {
  excellent: {
    color: 'var(--color-success-500)',
    bgLight: 'bg-success-50/70',
    bgDark: 'dark:bg-success-50/20',
    dotLight: 'bg-success-500',
    dotDark: 'dark:bg-success-500',
    textLight: 'text-success-600',
    textDark: 'dark:text-success-500',
    label: 'Excellent',
    range: '≥ 90%',
    borderLight: 'border-success-200/50',
    borderDark: 'dark:border-success-800/40',
    active: (passRate: number) => passRate >= 90,
  },
  warning: {
    color: 'var(--color-warning-500)',
    bgLight: 'bg-warning-50/70',
    bgDark: 'dark:bg-warning-50/20',
    dotLight: 'bg-warning-500',
    dotDark: 'dark:bg-warning-500',
    textLight: 'text-warning-600',
    textDark: 'dark:text-warning-500',
    label: 'Needs Improvement',
    range: '60% – 89%',
    borderLight: 'border-warning-200/50',
    borderDark: 'dark:border-warning-800/40',
    active: (passRate: number) => passRate >= 60 && passRate < 90,
  },
  critical: {
    color: 'var(--color-danger-500)',
    bgLight: 'bg-danger-50/70',
    bgDark: 'dark:bg-danger-50/20',
    dotLight: 'bg-danger-500',
    dotDark: 'dark:bg-danger-500',
    textLight: 'text-danger-600',
    textDark: 'dark:text-danger-500',
    label: 'Critical',
    range: '< 60%',
    borderLight: 'border-danger-200/50',
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

// Ring dimensions — 130px diameter
const SIZE = 130;
const RADIUS = 50;
const STROKE_WIDTH = 9;
const VIEWBOX = SIZE;
const CENTER = VIEWBOX / 2;
const circumference = 2 * Math.PI * RADIUS;

export default function PassRateRing({ passRate }: Props) {
  const activeCategory = categories.find((c) => c.active(passRate))!;

  const dashOffset = useMemo(() => circumference - (passRate / 100) * circumference, [passRate]);

  return (
    <div className="flex flex-col items-center justify-between w-full h-full">
      {/* Ring */}
      <div className="relative flex-1 flex flex-col items-center justify-center">
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
      <div className="mt-2 flex w-full flex-col gap-y-1">
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
