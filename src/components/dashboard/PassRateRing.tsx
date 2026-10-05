import { useMemo } from 'react';
import { HEALTH_CATEGORY_CONFIG } from '@/lib/theme';

export interface PassRateRingProps {
  passRate: number;
}

const categoryConfig = HEALTH_CATEGORY_CONFIG;

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

export default function PassRateRing({ passRate }: PassRateRingProps) {
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
