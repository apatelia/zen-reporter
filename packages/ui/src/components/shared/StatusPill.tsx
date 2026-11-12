const STATUS_PILL_STYLES: Record<string, { label: string; pillClass: string }> = {
  passed: {
    label: 'Passed',
    pillClass: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500',
  },
  failed: {
    label: 'Failed',
    pillClass: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500',
  },
  timedOut: {
    label: 'Timed Out',
    pillClass: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
  },
  interrupted: {
    label: 'Interrupted',
    pillClass: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500',
  },
  skipped: {
    label: 'Skipped',
    pillClass:
      'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600',
  },
};

/**
 * Renders a colored pill for a test status such as passed, failed, timedOut, interrupted, or skipped.
 *
 * @param props - object with `status` (status key to render), optional `tooltip` (tooltip text shown on hover), and optional `className` (extra CSS classes).
 * @returns a colored status pill.
 */
export function StatusPill({
  status,
  tooltip,
  className = '',
}: {
  status: string;
  tooltip?: string;
  className?: string;
}) {
  const style = STATUS_PILL_STYLES[status] ?? {
    label: status,
    pillClass:
      'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.pillClass} ${className}`}
      title={tooltip}
    >
      {style.label}
    </span>
  );
}
