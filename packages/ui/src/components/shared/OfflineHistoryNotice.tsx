export interface OfflineHistoryNoticeProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function OfflineHistoryNotice({
  title = 'History and cross-run insights require server mode',
  description = 'You are currently viewing a standalone offline report. Historical test runs and aggregate trends are saved in the project database.',
  className = '',
}: OfflineHistoryNoticeProps) {
  const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

  return (
    <div
      className={`rounded-lg border border-border-default bg-surface-50 p-8 text-center shadow-xs ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-text-body-mid dark:text-text-muted">
        {description}
      </p>

      <div className="mx-auto mt-6 inline-flex flex-col sm:flex-row items-center gap-3 rounded-md border border-border-default bg-surface-100/70 dark:bg-surface-200/50 px-4 py-3">
        <span className="text-xs font-medium text-text-body-mid dark:text-text-muted">
          {isFileProtocol ? 'To view history & trends, run:' : 'To view local history, run:'}
        </span>
        <code className="select-all rounded bg-canvas px-2.5 py-1 font-mono text-xs font-semibold text-accent-blue border border-border-default shadow-2xs">
          npx zr show
        </code>
      </div>
    </div>
  );
}
