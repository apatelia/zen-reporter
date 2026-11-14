import { useMemo } from 'react';
import type { TestCase } from '@arpanp/zen-core';
import { formatDurationVerbose, computeLatencyPercentiles } from '@arpanp/zen-core';
import InfoTooltip from '@/components/shared/InfoTooltip';

export interface TestSpeedConsistencyCardProps {
  allCases: TestCase[];
}

/**
 * Renders test execution speed, typical duration, and outlier consistency.
 *
 * @param props - Component props containing all test cases.
 * @param props.allCases - Flat list of all test cases in the test run.
 * @returns React functional component rendering the test speed and consistency card.
 */
export default function TestSpeedConsistencyCard({ allCases }: TestSpeedConsistencyCardProps) {
  const percentiles = useMemo(() => computeLatencyPercentiles(allCases), [allCases]);
  const isZero = percentiles.totalExecuted === 0;

  // Max reference is the slowest test duration (or 1ms if 0)
  const maxRef = Math.max(percentiles.max, 1);
  const p95Width = Math.min(100, Math.max(8, (percentiles.p95 / maxRef) * 100));
  // Unclamped median position inside the 95% zone (avoids distortion from width floors)
  const p50PosPct =
    percentiles.p95 > 0 ? Math.min(100, (percentiles.p50 / percentiles.p95) * 100) : 0;

  // Determine if there is a severe long-tail outlier gap (e.g. slowest test > 2x P95)
  const hasSevereOutlier = !isZero && percentiles.max > percentiles.p95 * 2;
  const outlierGapMultiplier =
    percentiles.p95 > 0 ? (percentiles.max / percentiles.p95).toFixed(1) : '∞';

  return (
    <div className="flex flex-col justify-between w-full h-full rounded-md bg-surface-50 border border-border-default p-5 shadow-xs">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
            Test Speed &amp; Consistency
            <span className="inline-block whitespace-nowrap ml-1">
              <InfoTooltip
                text="Shows typical test run speed and the long-tail outlier horizon. When the slowest test stretches far beyond the 95% horizon, investigate that bottleneck to immediately speed up the entire suite."
                className="z-30 inline-flex align-middle"
              />
            </span>
          </h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border whitespace-nowrap shrink-0 ${
              hasSevereOutlier
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                : 'bg-surface-200/50 text-text-body-mid dark:text-text-on-primary border-border-default'
            }`}
          >
            {isZero ? (
              'No Tests'
            ) : hasSevereOutlier ? (
              <>
                <span className="shrink-0">⚠️</span>
                <span>{outlierGapMultiplier}x Outlier</span>
              </>
            ) : (
              `95% < ${formatDurationVerbose(percentiles.p95)}`
            )}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
          Typical test run speed versus slow outliers
        </p>
      </div>

      {/* Main KPI */}
      <div className="my-3 flex items-baseline gap-2 min-h-9">
        <span className="text-3xl font-bold tracking-tight text-text-ink dark:text-text-on-primary">
          {isZero ? '—' : formatDurationVerbose(percentiles.p50)}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
          Typical Test Speed (Median)
        </span>
      </div>

      {/* Unified Full-Spectrum Horizon Bar */}
      <div className="space-y-1.5 mb-4">
        {/* Top Bar Labels */}
        <div className="flex items-center justify-between text-xs font-medium text-text-body-mid dark:text-text-muted h-4 gap-2">
          <span className="flex items-center gap-1 shrink-0">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isZero ? 'bg-text-muted/40' : 'bg-success-500'
              }`}
            />
            <span>
              {isZero
                ? 'No executed tests'
                : `95% of tests (≤ ${formatDurationVerbose(percentiles.p95)})`}
            </span>
          </span>
          <span
            className={`flex items-center gap-1 ${
              hasSevereOutlier
                ? 'text-danger-600 dark:text-danger-400 font-semibold'
                : 'text-text-muted'
            } truncate text-right`}
          >
            {isZero
              ? '—'
              : `${hasSevereOutlier ? '⚠️ Slow Outlier Tail' : 'Max'} (${formatDurationVerbose(percentiles.max)})`}
          </span>
        </div>

        {/* Visual Spectrum Bar */}
        <div className="h-3 w-full rounded-full bg-surface-200 dark:bg-surface-200 border border-border-default overflow-hidden relative flex">
          {/* 1. Main Healthy 95% Horizon (Green / Teal gradient) */}
          <div
            className="h-full bg-linear-to-r from-success-500 via-accent-blue to-accent-blue/80 relative rounded-l-full transition-all duration-500"
            style={{ width: `${isZero ? 0 : p95Width}%` }}
            title={`95% of tests finish in ${formatDurationVerbose(percentiles.p95)} or less`}
          >
            {/* Subtle median marker line inside the 95% zone */}
            {p50PosPct > 6 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/60 dark:bg-black/40"
                style={{ left: `${p50PosPct}%` }}
                title={`Median (P50): ${formatDurationVerbose(percentiles.p50)}`}
              />
            )}
          </div>

          {/* 2. Slow Outlier Tail (Amber / Red striped zone) */}
          {percentiles.max > percentiles.p95 && (
            <div
              className={`h-full transition-all duration-500 ${
                hasSevereOutlier
                  ? 'bg-linear-to-r from-amber-500 via-danger-500 to-danger-600 animate-pulse'
                  : 'bg-slate-400 dark:bg-slate-500'
              }`}
              style={{ width: `${100 - p95Width}%` }}
              title={`Slow Outlier Tail: Tests taking between ${formatDurationVerbose(percentiles.p95)} and ${formatDurationVerbose(percentiles.max)}`}
            />
          )}
        </div>

        {/* Bottom Context Explanation */}
        <div className="flex items-center justify-between text-[11px] text-text-muted h-4 gap-2">
          <span className="truncate">
            {isZero
              ? 'No data'
              : `Typical range: ${formatDurationVerbose(percentiles.p50)} – ${formatDurationVerbose(percentiles.p75)}`}
          </span>
          {isZero ? (
            <span className="truncate text-right">—</span>
          ) : hasSevereOutlier ? (
            <span className="text-danger-600 dark:text-danger-400 font-medium truncate text-right">
              Slowest test is {outlierGapMultiplier}x slower!
            </span>
          ) : (
            <span className="truncate text-right">Consistent run</span>
          )}
        </div>
      </div>

      {/* 3 Metrics Grid */}
      <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border-default dark:border-white/15">
        <div className="flex flex-col justify-between rounded-md border border-border-default bg-surface-100 dark:bg-surface-100 p-2 sm:p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            <span className="truncate">Fastest</span>
            <span className="text-success-500 font-bold shrink-0">⚡</span>
          </div>
          <span className="mt-1.5 font-mono font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
            {isZero ? '—' : formatDurationVerbose(percentiles.min)}
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-md border border-border-default bg-surface-100 dark:bg-surface-100 p-2 sm:p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            <span className="truncate">Typical</span>
            <span className="text-accent-blue font-bold shrink-0">⏱</span>
          </div>
          <span className="mt-1.5 font-mono font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
            {isZero ? '—' : formatDurationVerbose(percentiles.p50)}
          </span>
        </div>

        <div
          className={`flex flex-col justify-between rounded-md border p-2 sm:p-2.5 shadow-2xs transition-all ${
            hasSevereOutlier
              ? 'border-danger-500/30 bg-danger-500/5 dark:bg-danger-500/10'
              : 'border-border-default bg-surface-100 dark:bg-surface-100'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
            <span
              className={`truncate ${
                hasSevereOutlier
                  ? 'text-danger-700 dark:text-danger-400'
                  : 'text-text-body-mid dark:text-text-muted'
              }`}
            >
              Slowest
            </span>
            <span
              className={`shrink-0 ${
                hasSevereOutlier
                  ? 'text-danger-600 dark:text-danger-400 font-bold'
                  : 'text-amber-500 font-bold'
              }`}
            >
              ⚠️
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-1 min-w-0">
            <span
              className={`font-mono font-bold text-sm truncate ${
                hasSevereOutlier
                  ? 'text-danger-700 dark:text-danger-400'
                  : 'text-text-ink dark:text-text-on-primary'
              }`}
            >
              {isZero ? '—' : formatDurationVerbose(percentiles.max)}
            </span>
            {hasSevereOutlier && (
              <span className="rounded bg-danger-500/15 px-1 py-0.2 text-[9px] font-bold text-danger-700 dark:text-danger-300 uppercase tracking-tight shrink-0">
                Outlier
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
