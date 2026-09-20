import React from 'react';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  description?: string;
  badgeClass?: string;
  valueClassName?: string;
  title?: string;
  subtextTitle?: string;
  isFirst?: boolean;
  isLast?: boolean;
  className?: string;
}

export default function StatCard({
  label,
  value,
  subtext,
  description,
  badgeClass,
  valueClassName = '',
  title,
  subtextTitle,
  isFirst = false,
  isLast = false,
  className = '',
}: StatCardProps) {
  const tooltipPosClass = isLast
    ? 'right-0 translate-x-0'
    : isFirst
      ? 'left-0 translate-x-0'
      : 'left-1/2 -translate-x-1/2';
  const arrowPosClass = isLast
    ? 'right-2.5 translate-x-0'
    : isFirst
      ? 'left-2.5 translate-x-0'
      : 'left-1/2 -translate-x-1/2';

  const valueTitle = title || (typeof value === 'string' ? value : undefined);
  const subTitle = subtextTitle || subtext;

  return (
    <div
      className={`flex flex-col justify-between rounded-md bg-canvas border border-border-default p-4 shadow-sm ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {label}
          </span>
          {description && (
            <div className="group relative inline-flex items-center">
              <svg
                className="h-3.5 w-3.5 cursor-help text-text-body-mid opacity-60 hover:opacity-100 dark:text-text-muted transition-opacity"
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
              <div
                className={`pointer-events-none absolute bottom-full mb-2 hidden group-hover:block z-50 w-48 rounded bg-slate-900 dark:bg-slate-800 p-2 text-center text-xs text-white shadow-lg ring-1 ring-slate-700 ${tooltipPosClass}`}
              >
                {description}
                <div
                  className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800 ${arrowPosClass}`}
                />
              </div>
            </div>
          )}
        </div>
        <p
          className={`mt-2 text-xl font-bold text-text-ink dark:text-text-on-primary truncate ${valueClassName}`}
          title={valueTitle}
        >
          {value}
        </p>
      </div>

      {subtext && (
        <div className="mt-3">
          <span
            className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium truncate max-w-full ${badgeClass || ''}`}
            title={subTitle}
          >
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
}
