import React from 'react';

export interface InfoTooltipProps {
  text: string;
  isFirst?: boolean;
  isLast?: boolean;
  className?: string;
}

/**
 * Renders an informational icon with a hover tooltip for metric explanations and contextual details.
 */
export function InfoTooltip({
  text,
  isFirst = false,
  isLast = false,
  className = '',
}: InfoTooltipProps) {
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

  return (
    <div className={`group relative inline-flex items-center ${className}`}>
      <svg
        className="h-4 w-4 cursor-help text-accent-blue shrink-0"
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
        className={`pointer-events-none absolute top-full mt-2 hidden group-hover:block z-50 w-48 rounded-md bg-[var(--color-tooltip-bg)] text-[var(--color-tooltip-text)] p-2 text-center text-xs shadow-lg border border-[var(--color-tooltip-border)] ${tooltipPosClass}`}
      >
        {text}
        <div
          className={`absolute bottom-full -mb-1 border-4 border-transparent border-b-[var(--color-tooltip-bg)] ${arrowPosClass}`}
        />
      </div>
    </div>
  );
}

export default InfoTooltip;
