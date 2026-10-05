import type { ResultSummary, TestSuite } from '@/lib/types/report';
import { formatDuration } from '@/lib/formatters';
import { computeSlowestTest, computeFastestTest, collectAllCases } from '@/lib/statsUtils';

export interface ExecutionTimingEfficiencyCardProps {
  summary: ResultSummary;
  suites: TestSuite[];
}

export default function ExecutionTimingEfficiencyCard({
  summary,
  suites,
}: ExecutionTimingEfficiencyCardProps) {
  const isParallel = Boolean(summary.workers && summary.workers > 1);
  const sequentialMs = summary.totalSequentialDuration ?? 0;
  const parallelMs = summary.duration;

  const hasSavings = isParallel && sequentialMs > parallelMs;
  const isOverhead = isParallel && parallelMs > sequentialMs && sequentialMs > 0;
  const savedMs = hasSavings ? sequentialMs - parallelMs : 0;
  const overheadMs = isOverhead ? parallelMs - sequentialMs : 0;

  const speedupRatio = sequentialMs > 0 ? sequentialMs / Math.max(1, parallelMs) : 1;
  const speedup = hasSavings ? speedupRatio.toFixed(1) : speedupRatio.toFixed(1);

  const maxDuration = Math.max(sequentialMs, parallelMs, 1);
  const seqWidthPct = Math.min(100, Math.max(8, (sequentialMs / maxDuration) * 100));
  const parWidthPct = Math.min(100, Math.max(8, (parallelMs / maxDuration) * 100));

  const allCases = collectAllCases(suites);
  const executedTotal = summary.total - summary.skipped;
  const avgDuration = executedTotal > 0 ? Math.round(summary.duration / executedTotal) : 0;
  const slowestTest = computeSlowestTest(allCases);
  const fastestTest = computeFastestTest(allCases);

  return (
    <div className="flex flex-col justify-between w-full h-full rounded-md bg-canvas border border-border-default p-5 shadow-xs">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
              Execution Efficiency & Timing
            </h3>
            <div className="relative group/speedup-tip inline-flex items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center p-1 rounded-full text-accent-blue hover:bg-accent-blue/10 dark:text-accent-blue dark:hover:bg-accent-blue/20 transition-colors focus:outline-none cursor-pointer"
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
                    Sequential Effort / Wall-Clock Duration
                  </span>
                </p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-text-body-mid dark:text-text-muted">
                  <li>
                    • <strong className="text-text-ink dark:text-text-on-primary">&gt;1.0x:</strong>{' '}
                    Time saved via parallelism
                  </li>
                  <li>
                    • <strong className="text-text-ink dark:text-text-on-primary">=1.0x:</strong>{' '}
                    Equal to sequential effort
                  </li>
                  <li>
                    • <strong className="text-text-ink dark:text-text-on-primary">&lt;1.0x:</strong>{' '}
                    Parallel worker/setup overhead
                  </li>
                </ul>
              </div>
            </div>
          </div>
          {hasSavings ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2.5 py-0.5 text-xs font-semibold text-success-600 dark:text-success-500 border border-success-500/20">
              ⚡ {speedup}x speedup
            </span>
          ) : isOverhead ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-500 border border-amber-500/20">
              ⚠️ Overhead ({summary.workers} workers)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
              {isParallel ? `${summary.workers} workers` : '1 worker'}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
          Parallel execution metrics and test case duration distribution
        </p>
      </div>

      {/* Main Metric */}
      <div className="my-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-text-ink dark:text-text-on-primary">
          {hasSavings
            ? formatDuration(savedMs)
            : isOverhead
              ? formatDuration(overheadMs)
              : formatDuration(parallelMs)}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
          {hasSavings
            ? 'Time Saved via Parallelism'
            : isOverhead
              ? 'Parallel Overhead'
              : 'Wall-Clock Duration'}
        </span>
      </div>

      {/* Dual Bar Comparison */}
      <div className="space-y-2 mb-4">
        {/* Sequential Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-text-body-mid dark:text-text-muted mb-1">
            <span>Sequential Effort</span>
            <span className="font-mono font-bold text-text-ink dark:text-text-on-primary">
              {formatDuration(sequentialMs)}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-surface-200 dark:bg-surface-200 border border-border-default/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-600 dark:bg-slate-300 transition-all duration-500"
              style={{ width: `${seqWidthPct}%` }}
            />
          </div>
        </div>

        {/* Parallel Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-text-body-mid dark:text-text-muted mb-1">
            <span>Actual Wall-Clock</span>
            <span className="font-mono font-bold text-text-ink dark:text-text-on-primary">
              {formatDuration(parallelMs)}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-surface-200 dark:bg-surface-200 border border-border-default/50 overflow-hidden">
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
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-default/60">
        <div className="flex flex-col rounded-md border border-border-default/50 bg-surface-100/50 p-2 dark:bg-surface-100/30">
          <span className="text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            Avg Duration
          </span>
          <span className="text-sm font-bold text-text-ink dark:text-text-on-primary">
            {formatDuration(avgDuration)}
          </span>
        </div>

        <div className="flex flex-col rounded-md border border-border-default/50 bg-surface-100/50 p-2 dark:bg-surface-100/30">
          <span className="text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            Slowest Test
          </span>
          <span className="text-sm font-bold text-text-ink dark:text-text-on-primary">
            {formatDuration(slowestTest)}
          </span>
        </div>

        <div className="flex flex-col rounded-md border border-border-default/50 bg-surface-100/50 p-2 dark:bg-surface-100/30">
          <span className="text-[11px] font-semibold text-text-body-mid dark:text-text-muted uppercase tracking-wider">
            Fastest Test
          </span>
          <span className="text-sm font-bold text-text-ink dark:text-text-on-primary">
            {formatDuration(fastestTest)}
          </span>
        </div>
      </div>
    </div>
  );
}
