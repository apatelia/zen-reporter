import { formatDurationVerbose } from '@/lib/formatters';
import { type AttemptView, getAttemptDuration, statusConfig } from './AttemptView';

export interface AttemptTabSelectorProps {
  attempts: AttemptView[];
  activeAttemptIdx: number;
  onSelectAttempt: (idx: number) => void;
}

export function AttemptTabSelector({
  attempts,
  activeAttemptIdx,
  onSelectAttempt,
}: AttemptTabSelectorProps) {
  if (attempts.length <= 1) return null;

  const statusLabel = (status: AttemptView['status']): string =>
    status === 'timedOut'
      ? 'Timed Out'
      : status === 'interrupted'
        ? 'Interrupted'
        : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-1.5">
        {attempts.map((attempt, idx) => {
          const isActive = idx === activeAttemptIdx;
          const tabTitle = idx === 0 ? 'Run' : `Retry #${idx}`;
          return (
            <button
              key={`attempt-tab-${tabTitle}-${attempt.status}-${attempt.duration}`}
              type="button"
              onClick={() => onSelectAttempt(idx)}
              title={idx === 0 ? 'Original run details' : `Retry #${idx} details`}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? 'border-primary-500 bg-canvas text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/50'
                  : 'border-border-default bg-canvas text-text-body-mid hover:bg-surface-100 dark:text-text-muted dark:hover:bg-surface-200/30'
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${statusConfig[attempt.status].dot}`}
              />
              {tabTitle}
              <span className="font-normal text-[11px] text-text-body-mid dark:text-text-muted tabular-nums">
                {statusLabel(attempt.status)} · {formatDurationVerbose(getAttemptDuration(attempt))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
