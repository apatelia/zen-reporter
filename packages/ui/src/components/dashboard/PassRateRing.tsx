import { useMemo } from 'react';
import { HEALTH_CATEGORY_CONFIG } from '@arpanp/zen-core';
import InfoTooltip from '../shared/InfoTooltip';

export interface PassRateRingProps {
  passRate: number;
  cleanPassed?: number;
  flakyCount?: number;
  total?: number;
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

/**
 * Renders an animated SVG radial gauge displaying the suite overall pass rate,
 * dual-tone segments for clean passed and flaky recovered tests, and health indicators.
 *
 * @param props - Component props containing pass rate, clean passed count, flaky count, and total.
 * @returns React functional component rendering the pass rate gauge ring.
 */
export default function PassRateRing({
  passRate,
  cleanPassed = 0,
  flakyCount = 0,
  total = 0,
}: PassRateRingProps) {
  const hasFlaky = flakyCount > 0;
  const isAllFlakyPass = passRate >= 90 && cleanPassed === 0 && hasFlaky;

  // If pass rate is high (>=90%) but 100% of passes were flaky retries, category is adjusted to Needs Improvement
  const effectiveCategory = isAllFlakyPass
    ? categoryConfig.warning
    : categories.find((c) => c.active(passRate))!;

  const cleanPct = total > 0 ? (cleanPassed / total) * 100 : passRate;
  const flakyPct = total > 0 ? (flakyCount / total) * 100 : 0;

  const cleanDash = (cleanPct / 100) * circumference;
  const flakyDash = (flakyPct / 100) * circumference;

  const singleDashOffset = useMemo(
    () => circumference - (passRate / 100) * circumference,
    [passRate]
  );

  return (
    <div className="flex flex-col justify-between w-full h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
              Overall Pass Rate
            </h3>
            <InfoTooltip
              text="Suite Pass Rate includes both first-run clean passes and recovered flaky tests (Pass Rate = [Clean Passed + Flaky] / Total)."
              position="bottom"
              isFirst={true}
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted text-left">
          {hasFlaky
            ? `Includes ${flakyCount} recovered flaky ${flakyCount === 1 ? 'test' : 'tests'}`
            : 'Percentage of passed test cases across all suites'}
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
          {hasFlaky && total > 0 ? (
            <>
              {/* Clean passed segment (green) */}
              {cleanDash > 0 && (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke="var(--color-success-500)"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${cleanDash} ${circumference}`}
                  strokeDashoffset={0}
                  strokeLinecap={flakyDash > 0 ? 'butt' : 'round'}
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                  className="transition-all duration-700 ease-out"
                />
              )}
              {/* Flaky recovered segment (amber) */}
              {flakyDash > 0 && (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke="var(--color-warning-500)"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${flakyDash} ${circumference}`}
                  strokeDashoffset={-cleanDash}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                  className="transition-all duration-700 ease-out"
                />
              )}
            </>
          ) : (
            /* Standard single progress ring */
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={effectiveCategory.color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={circumference}
              strokeDashoffset={singleDashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-ink dark:text-text-on-primary">
            {Math.round(passRate)}%
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {isAllFlakyPass ? 'Flaky Pass' : 'Pass Rate'}
          </span>
        </div>
      </div>

      {/* Category indicators */}
      <div className="mt-auto flex w-full flex-col gap-y-1">
        {categories.map((cat) => {
          const isActive = isAllFlakyPass
            ? cat === categoryConfig.warning
            : isCategoryActive(cat, passRate);
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
                  {isAllFlakyPass && cat === categoryConfig.warning && (
                    <span className="ml-1 text-[10px] font-normal opacity-75">(Unstable)</span>
                  )}
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
