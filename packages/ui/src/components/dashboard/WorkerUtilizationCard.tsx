import { useMemo } from 'react';
import type { ResultSummary, TestCase } from '@arpanp/zen-core';
import InfoTooltip from '@/components/shared/InfoTooltip';

export interface WorkerUtilizationCardProps {
  summary: ResultSummary;
  allCases: TestCase[];
}

/**
 * Renders worker active utilization, idle waiting time, and bottleneck impact.
 *
 * @param props - Component props containing summary and all test cases.
 * @param props.summary - Test run result summary metrics.
 * @param props.allCases - Flat list of all test cases in the test run.
 * @returns React functional component rendering the worker utilization card.
 */
export default function WorkerUtilizationCard({ summary, allCases }: WorkerUtilizationCardProps) {
  const workers = Math.max(1, summary.workers ?? 1);
  const isParallel = workers > 1;

  const sequentialMs = summary.totalSequentialDuration ?? 0;
  const wallClockMs = summary.duration;

  // Theoretical max compute capacity = workers * wallClockMs
  const totalCapacityMs = workers * wallClockMs;
  const activePct =
    totalCapacityMs > 0 ? Math.min(100, Math.round((sequentialMs / totalCapacityMs) * 100)) : 100;
  const idlePct = 100 - activePct;

  // Single-pass computation for spec count, density, and max test duration
  const { specCount, testDensity, maxTestDuration, executedCount } = useMemo(() => {
    const fileSet = new Set<string>();
    let executedCount = 0;
    let maxDuration = 0;

    for (const tc of allCases) {
      if (tc.status === 'skipped') continue;
      executedCount++;
      if (tc.fileName) fileSet.add(tc.fileName);
      const duration = tc.duration || 0;
      if (duration > maxDuration) {
        maxDuration = duration;
      }
    }

    const uniqueSpecs = fileSet.size;
    const density = uniqueSpecs > 0 ? (executedCount / uniqueSpecs).toFixed(1) : '0';

    return {
      specCount: uniqueSpecs,
      testDensity: density,
      maxTestDuration: maxDuration,
      executedCount,
    };
  }, [allCases]);

  // Long-tail impact: Slowest test duration vs wallClockMs
  const bottleneckPct =
    wallClockMs > 0 ? Math.min(100, Math.round((maxTestDuration / wallClockMs) * 100)) : 0;

  // Signal 1: the slowest single test dominates the run time (>= 50% of the run)
  const isBottlenecked = isParallel && executedCount > 0 && bottleneckPct >= 50;
  // Signal 2: too much fleet capacity sat unused (uneven distribution across workers)
  const isImbalanced = isParallel && executedCount > 0 && idlePct >= 50;
  const noTests = executedCount === 0;

  let badgeClass: string;
  let badgeLabel: string;

  if (noTests) {
    badgeClass =
      'bg-surface-200/50 text-text-body-mid dark:text-text-on-primary border-border-default';
    badgeLabel = 'No Tests';
  } else if (isParallel && bottleneckPct >= 70) {
    badgeClass = 'bg-danger-500/10 text-danger-700 dark:text-danger-400 border-danger-500/25';
    badgeLabel = '⚠️ Heavy Bottleneck';
  } else if (isBottlenecked) {
    badgeClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
    badgeLabel = '⚠️ Slow Test';
  } else if (isImbalanced) {
    badgeClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
    badgeLabel = '⚠️ Imbalanced';
  } else {
    badgeClass = 'bg-success-500/10 text-success-600 dark:text-success-500 border-success-500/20';
    badgeLabel = isParallel ? `${activePct}% Active` : '1 Worker';
  }

  return (
    <div className="flex flex-col justify-between w-full h-full rounded-md bg-surface-50 border border-border-default p-5 shadow-xs">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
            Worker Utilization{' '}
            <InfoTooltip
              text="Shows whether tests were balanced evenly across parallel workers. A high idle wait means other workers finished early and had to sit idle waiting for a single slow test to complete. Single-worker serial runs show 100% utilization by definition."
              className="z-30 inline-flex align-middle ml-1"
            />
          </h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap shrink-0 ${badgeClass}`}
          >
            {badgeLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
          Active worker execution versus idle waiting time
        </p>
      </div>

      {/* Main KPI */}
      <div className="my-3 flex items-baseline gap-2 min-h-9">
        <span className="text-3xl font-bold tracking-tight text-text-ink dark:text-text-on-primary">
          {noTests ? '—' : isParallel ? `${activePct}%` : '100%'}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
          {noTests
            ? 'No Executed Tests'
            : isParallel
              ? `Worker Active Time (${idlePct}% idle wait)`
              : 'Single Worker (Serial execution)'}
        </span>
      </div>

      {/* Visual Workload Distribution & Bottleneck Horizon Bar */}
      <div className="space-y-1.5 mb-4">
        {/* Top Labels */}
        <div className="flex items-center justify-between text-xs font-medium text-text-body-mid dark:text-text-muted h-4">
          <span className="flex items-center gap-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                noTests
                  ? 'bg-text-muted/40'
                  : activePct >= 70
                    ? 'bg-success-500'
                    : activePct >= 40
                      ? 'bg-accent-blue'
                      : 'bg-amber-500'
              }`}
            />
            <span>{noTests ? 'No executed tests' : `Active work (${activePct}%)`}</span>
          </span>
          <span
            className={`flex items-center gap-1 font-semibold ${
              noTests
                ? 'text-text-muted'
                : isImbalanced
                  ? 'text-danger-600 dark:text-danger-400'
                  : 'text-text-muted'
            }`}
          >
            {noTests ? '—' : `${isImbalanced ? '⚠️ Imbalanced' : 'Idle'} (${idlePct}%)`}
          </span>
        </div>

        {/* Stacked Horizon Bar: Active vs Idle Waiting */}
        <div className="h-3 w-full rounded-full bg-surface-200 dark:bg-surface-200 border border-border-default overflow-hidden relative flex">
          {/* Active Work Portion */}
          <div
            className={`h-full transition-all duration-500 ${
              activePct >= 70
                ? 'bg-success-500'
                : activePct >= 40
                  ? 'bg-accent-blue'
                  : 'bg-amber-500'
            }`}
            style={{ width: `${noTests ? 0 : isParallel ? activePct : 100}%` }}
            title={
              noTests ? 'No executed tests' : `Workers actively executing tests: ${activePct}%`
            }
          />

          {/* Idle Waiting Portion */}
          {isParallel && !noTests && idlePct > 0 && (
            <div
              className={`h-full transition-all duration-500 ${
                isImbalanced
                  ? 'bg-linear-to-r from-amber-500 via-danger-500 to-danger-600 animate-pulse'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              style={{ width: `${idlePct}%` }}
              title={`Idle Waiting Time: ${idlePct}% of total worker capacity went unused`}
            />
          )}
        </div>

        {/* Bottom Context Explanation */}
        <div className="flex items-center justify-between text-[11px] text-text-muted h-4 gap-2">
          <span className="truncate">
            {workers === 1 ? 'Single worker' : `${workers} parallel workers`}
          </span>
          {!isParallel || noTests ? (
            <span className="truncate text-right">—</span>
          ) : isBottlenecked ? (
            <span className="text-danger-600 dark:text-danger-400 font-medium truncate text-right">
              Slowest test took {bottleneckPct}% of the run!
            </span>
          ) : isImbalanced ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium truncate text-right">
              Workers finished early — {idlePct}% of capacity sat idle
            </span>
          ) : (
            <span className="truncate text-right">Workload balanced evenly</span>
          )}
        </div>
      </div>

      {/* 3 Metrics Grid */}
      <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border-default dark:border-white/15">
        <div className="flex flex-col justify-between rounded-md border border-border-default bg-surface-100 dark:bg-surface-100 p-2 sm:p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            <span className="truncate">Workload</span>
            <span className="text-accent-blue font-bold shrink-0">📄</span>
          </div>
          <span className="mt-1.5 font-mono font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
            {specCount} {specCount === 1 ? 'Spec' : 'Specs'}
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-md border border-border-default bg-surface-100 dark:bg-surface-100 p-2 sm:p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            <span className="truncate">Density</span>
            <span className="text-accent-blue font-bold shrink-0">∑</span>
          </div>
          <span className="mt-1.5 font-mono font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
            {testDensity} tests/spec
          </span>
        </div>

        <div
          className={`flex flex-col justify-between rounded-md border p-2 sm:p-2.5 shadow-2xs transition-all ${
            isBottlenecked
              ? 'border-danger-500/30 bg-danger-500/5 dark:bg-danger-500/10'
              : 'border-border-default bg-surface-100 dark:bg-surface-100'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
            <span
              className={`truncate ${
                isBottlenecked
                  ? 'text-danger-700 dark:text-danger-400'
                  : 'text-text-body-mid dark:text-text-muted'
              }`}
            >
              Slowest Test
            </span>
            <span
              className={`shrink-0 ${
                isBottlenecked
                  ? 'text-danger-600 dark:text-danger-400 font-bold'
                  : 'text-amber-500 font-bold'
              }`}
            >
              ⚠️
            </span>
          </div>
          <span
            className={`mt-1.5 font-mono font-bold text-sm truncate ${
              isBottlenecked
                ? 'text-danger-700 dark:text-danger-400'
                : 'text-text-ink dark:text-text-on-primary'
            }`}
          >
            {noTests ? '—' : `${bottleneckPct}% of run`}
          </span>
        </div>
      </div>
    </div>
  );
}
