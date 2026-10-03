import type { ResultSummary } from '@/lib/types/report';
import { formatDuration } from '@/lib/formatters';

interface ExecutionEfficiencyCardProps {
  summary: ResultSummary;
}

export default function ExecutionEfficiencyCard({ summary }: ExecutionEfficiencyCardProps) {
  const isParallel = Boolean(summary.workers && summary.workers > 1);
  const sequentialMs = summary.totalSequentialDuration ?? 0;
  const parallelMs = summary.duration;

  const hasSavings = isParallel && sequentialMs > parallelMs;
  const savedMs = hasSavings ? sequentialMs - parallelMs : 0;
  const speedup = hasSavings ? (sequentialMs / Math.max(1, parallelMs)).toFixed(1) : '1.0';

  const maxDuration = Math.max(sequentialMs, parallelMs, 1);
  const seqWidthPct = Math.min(100, Math.max(8, (sequentialMs / maxDuration) * 100));
  const parWidthPct = Math.min(100, Math.max(8, (parallelMs / maxDuration) * 100));

  return (
    <div className="flex flex-col justify-between w-full h-full rounded-md bg-canvas border border-border-default p-5 shadow-sm">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
            Execution Efficiency
          </h3>
          {hasSavings ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2.5 py-0.5 text-xs font-semibold text-success-600 dark:text-success-500 border border-success-500/20">
              ⚡ {speedup}x speedup
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
              {isParallel ? `${summary.workers} workers` : '1 worker'}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
          {isParallel
            ? `Parallel execution using ${summary.workers} worker threads`
            : 'Sequential execution (single worker thread)'}
        </p>
      </div>

      {/* Main Saved Time Metric if savings present */}
      <div className="my-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-text-ink dark:text-text-on-primary">
          {hasSavings ? formatDuration(savedMs) : formatDuration(parallelMs)}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
          {hasSavings ? 'Time Saved via Parallelism' : 'Wall-Clock Duration'}
        </span>
      </div>

      {/* Dual Bar Comparison */}
      <div className="space-y-3 mt-auto">
        {/* Sequential Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-text-body-mid dark:text-text-muted mb-1">
            <span>Sequential Effort</span>
            <span className="font-mono font-bold text-text-ink dark:text-text-on-primary">
              {formatDuration(sequentialMs)}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-surface-200 dark:bg-surface-200 border border-border-default/50 overflow-hidden">
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
          <div className="h-3 w-full rounded-full bg-surface-200 dark:bg-surface-200 border border-border-default/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hasSavings ? 'bg-success-500' : 'bg-accent-blue'
              }`}
              style={{ width: `${parWidthPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
