import { useEffect, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const container = containerRef.current;
      const activeButton = buttonsRef.current[activeAttemptIdx];
      if (!container || !activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: activeRect.left - containerRect.left - container.clientLeft,
        top: activeRect.top - containerRect.top - container.clientTop,
        width: activeRect.width,
        height: activeRect.height,
        opacity: 1,
      });
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeAttemptIdx, attempts]);

  if (attempts.length <= 1) return null;

  const statusLabel = (status: AttemptView['status']): string =>
    status === 'timedOut'
      ? 'Timed Out'
      : status === 'interrupted'
        ? 'Interrupted'
        : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="mb-4">
      <div
        ref={containerRef}
        className="relative inline-flex items-center flex-wrap rounded-lg border border-border-default bg-surface-100 p-0.5 shadow-2xs"
      >
        {/* Sliding Active Pill Indicator */}
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(${indicatorStyle.left}px, ${indicatorStyle.top}px, 0)`,
            width: `${indicatorStyle.width}px`,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.opacity,
          }}
          className="pointer-events-none absolute left-0 top-0 rounded-md bg-canvas shadow-sm shadow-black/8 ring-1 ring-border-default/80 dark:bg-accent-blue/25 dark:ring-accent-blue/30 transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
        />

        {attempts.map((attempt, idx) => {
          const isActive = idx === activeAttemptIdx;
          const tabTitle = idx === 0 ? 'Run' : `Retry #${idx}`;
          return (
            <button
              key={`attempt-tab-${tabTitle}-${attempt.status}-${attempt.duration}`}
              ref={(el) => {
                buttonsRef.current[idx] = el;
              }}
              type="button"
              onClick={() => onSelectAttempt(idx)}
              title={idx === 0 ? 'Original run details' : `Retry #${idx} details`}
              className={`relative z-10 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'text-accent-blue dark:text-accent-blue font-bold'
                  : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary font-medium'
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${statusConfig[attempt.status].dot}`}
              />
              <span>{tabTitle}</span>
              <span className="font-normal text-[11px] opacity-80 tabular-nums">
                {statusLabel(attempt.status)} · {formatDurationVerbose(getAttemptDuration(attempt))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
