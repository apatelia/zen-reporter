interface HistoryDisabledBannerProps {
  className?: string;
}

export default function HistoryDisabledBanner({ className = '' }: HistoryDisabledBannerProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 ${className}`}
      role="alert"
    >
      <svg
        className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <div className="text-sm font-medium">
        History tracking is turned off. Showing past test runs only. Enable history in config to
        record new runs.
      </div>
    </div>
  );
}
