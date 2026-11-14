import type { ResultSummary } from '@arpanp/zen-core';
import { formatDurationVerbose } from '@arpanp/zen-core';

export interface ParallelSpeedupCardProps {
  summary: ResultSummary;
}

/**
 * Execution speedup & parallel acceleration card.
 *
 * @param props - Component props containing summary.
 * @param props.summary - Test run result summary metrics.
 * @returns React functional component rendering the parallel speedup card.
 */
export default function ParallelSpeedupCard({ summary }: ParallelSpeedupCardProps) {
  const workers = Math.max(1, summary.workers ?? 1);
  const isParallel = workers > 1;
  const sequentialMs = summary.totalSequentialDuration ?? 0;
  const parallelMs = summary.duration;

  const hasSavings = isParallel && sequentialMs > parallelMs;
  const isOverhead = isParallel && parallelMs > sequentialMs && sequentialMs > 0;
  const savedMs = hasSavings ? sequentialMs - parallelMs : 0;
  const overheadMs = isOverhead ? parallelMs - sequentialMs : 0;

  // Serial runs: wall-clock duration includes harness startup/setup/teardown that the
  // per-test duration sum excludes, so the gap is run overhead, not wasted time.
  const serialOverheadMs =
    isParallel || sequentialMs === 0 ? 0 : Math.max(0, parallelMs - sequentialMs);
  const isSerialOverhead = !isParallel && serialOverheadMs > 0;

  const speedupRatio = sequentialMs > 0 ? sequentialMs / Math.max(1, parallelMs) : 1;
  const speedup = speedupRatio.toFixed(1);

  const savedPct = sequentialMs > 0 ? Math.round((savedMs / sequentialMs) * 100) : 0;

  const maxDuration = Math.max(sequentialMs, parallelMs, 1);
  const seqWidthPct =
    sequentialMs > 0 ? Math.min(100, Math.max(8, (sequentialMs / maxDuration) * 100)) : 0;
  const parWidthPct =
    parallelMs > 0 ? Math.min(100, Math.max(8, (parallelMs / maxDuration) * 100)) : 0;

  const executedTotal = summary.total - summary.skipped;
  const isZeroExecution = executedTotal === 0;
  const avgDuration = executedTotal > 0 ? Math.round(sequentialMs / executedTotal) : 0;

  return (
    <div className="flex flex-col justify-between w-full h-full rounded-md bg-surface-50 border border-border-default p-5 shadow-xs">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
            Parallel Speedup{' '}
            <div className="relative group/speedup-tip inline-flex items-center align-middle ml-1">
              <button
                type="button"
                className="inline-flex items-center justify-center p-0.5 rounded-full text-accent-blue hover:bg-accent-blue/10 dark:text-accent-blue dark:hover:bg-accent-blue/20 transition-colors focus:outline-none cursor-pointer"
                aria-label="Speedup interpretation info"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </button>
              <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-30 hidden w-64 rounded-md border border-border-default bg-surface-100 p-3 shadow-xl group-hover/speedup-tip:block dark:bg-canvas">
                <div className="font-semibold text-xs text-text-ink dark:text-text-on-primary mb-1">
                  Speedup Ratio Formula
                </div>
                <p className="text-[11px] leading-relaxed text-text-body-mid dark:text-text-muted">
                  <span className="font-mono text-text-ink dark:text-text-on-primary">
                    Serial Effort / Actual Wall-Clock Duration
                  </span>
                </p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-text-body-mid dark:text-text-muted">
                  <li>
                    • <strong className="text-text-ink dark:text-text-on-primary">&gt;1.0x:</strong>{' '}
                    Time saved by running tests across parallel workers
                  </li>
                  <li>
                    • <strong className="text-text-ink dark:text-text-on-primary">=1.0x:</strong>{' '}
                    Equal to single-worker sequential effort
                  </li>
                  <li>
                    • <strong className="text-text-ink dark:text-text-on-primary">Serial:</strong>{' '}
                    Gap between bars is setup/harness overhead, not lost time
                  </li>
                </ul>
              </div>
            </div>
          </h3>
          {isZeroExecution ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap shrink-0 bg-surface-200/50 text-text-body-mid dark:text-text-on-primary border-border-default">
              No Tests
            </span>
          ) : hasSavings ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2.5 py-0.5 text-xs font-semibold text-success-600 dark:text-success-500 border border-success-500/20">
              ⚡ {speedup}x Faster
            </span>
          ) : isOverhead ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-500 border border-amber-500/20">
              ⚠️ Overhead ({workers} workers)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
              {isParallel ? `${workers} workers` : 'Serial run'}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
          {isZeroExecution
            ? 'No tests were executed in this run'
            : !isParallel
              ? 'No parallelism — gap between bars is setup/harness overhead'
              : 'Time saved by executing tests across parallel workers'}
        </p>
      </div>

      {/* Main Metric */}
      <div className="my-3 flex items-baseline gap-2 min-h-9">
        <span className="text-3xl font-bold tracking-tight text-text-ink dark:text-text-on-primary">
          {hasSavings
            ? formatDurationVerbose(savedMs)
            : isOverhead
              ? formatDurationVerbose(overheadMs)
              : isSerialOverhead
                ? formatDurationVerbose(serialOverheadMs)
                : formatDurationVerbose(parallelMs)}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
          {hasSavings
            ? 'Time Saved via Parallel Execution'
            : isOverhead
              ? 'Parallel Overhead'
              : isSerialOverhead
                ? 'Run Overhead (Setup & Teardown)'
                : 'Run Duration'}
        </span>
      </div>

      {/* Dual Bar Comparison */}
      <div className="space-y-1.5 mb-4">
        {/* Sequential Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-text-body-mid dark:text-text-muted mb-1 h-4">
            <span>If run one-by-one</span>
            <span className="font-mono font-bold text-text-ink dark:text-text-on-primary">
              {formatDurationVerbose(sequentialMs)}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-surface-200 dark:bg-surface-200 border border-border-default overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-600 dark:bg-slate-300 transition-all duration-500"
              style={{ width: `${seqWidthPct}%` }}
            />
          </div>
        </div>

        {/* Parallel Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-text-body-mid dark:text-text-muted mb-1 h-4">
            <span>Actual run time</span>
            <span className="font-mono font-bold text-text-ink dark:text-text-on-primary">
              {formatDurationVerbose(parallelMs)}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-surface-200 dark:bg-surface-200 border border-border-default overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hasSavings ? 'bg-success-500' : isOverhead ? 'bg-amber-500' : 'bg-accent-blue'
              }`}
              style={{ width: `${parWidthPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timing Metric Badges Grid */}
      <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border-default dark:border-white/15">
        <div className="flex flex-col justify-between rounded-md border border-border-default bg-surface-100 dark:bg-surface-100 p-2 sm:p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            <span className="truncate">Workers</span>
            <span className="text-accent-blue font-bold shrink-0">⚙</span>
          </div>
          <span className="mt-1.5 font-mono font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
            {isZeroExecution
              ? `${workers} Configured`
              : `${workers} ${workers === 1 ? 'Worker' : 'Active'}`}
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-md border border-border-default bg-surface-100 dark:bg-surface-100 p-2 sm:p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            <span className="truncate">Average Pace</span>
            <span className="text-accent-blue font-bold shrink-0">⏱</span>
          </div>
          {isZeroExecution ? (
            <span className="mt-1.5 font-mono font-bold text-sm text-text-muted truncate">—</span>
          ) : (
            <span className="mt-1.5 font-mono font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
              {formatDurationVerbose(avgDuration)}
            </span>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-md border border-border-default bg-surface-100 dark:bg-surface-100 p-2 sm:p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            <span className="truncate">Time Saved</span>
            <span className="text-success-500 font-bold shrink-0">⚡</span>
          </div>
          <span className="mt-1.5 font-mono font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
            {hasSavings ? `${savedPct}%` : isZeroExecution || !isParallel ? '—' : '0%'}
          </span>
        </div>
      </div>
    </div>
  );
}
