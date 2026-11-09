import { useState, useRef, useEffect, useMemo } from 'react';
import type { HistoryRun } from '@arpanp/zen-core';
import { formatDate, formatDuration, computePassRate } from '@arpanp/zen-core';
import { PassRateBadge } from '@/components/shared/PassRateBadge';

export interface HeaderRunSwitcherProps {
  currentRunId: string | null;
  runs: HistoryRun[];
  onSelectRun: (runId: string) => void;
  onOpenFullModal: () => void;
  onActiveRunSelected?: (run: HistoryRun) => void;
}

/**
 * HeaderRunSwitcher renders a quick dropdown menu in the top navigation bar to switch between
 * recent test runs, jump directly to the latest execution run, or launch the full Run Switcher modal.
 *
 * @param props - Component properties for the run switcher dropdown.
 * @param props.currentRunId - Unique identifier of the currently active test run.
 * @param props.runs - List of historical execution runs.
 * @param props.onSelectRun - Callback triggered when the user switches to a different run.
 * @param props.onOpenFullModal - Callback triggered when the user requests the full run switcher modal.
 * @param props.onActiveRunSelected - Optional callback triggered when the user selects the currently active run.
 * @returns The rendered dropdown switcher component, or null if there is only 1 run.
 */
export function HeaderRunSwitcher({
  currentRunId,
  runs,
  onSelectRun,
  onOpenFullModal,
  onActiveRunSelected,
}: HeaderRunSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasMultipleRuns = runs.length > 1;

  // Runs in reverse chronological order (newest first)
  const sortedRuns = useMemo(() => [...runs].reverse(), [runs]);
  const latestRun = sortedRuns[0] ?? null;
  const isViewingLatest = Boolean(latestRun && currentRunId === latestRun.run_id);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Show up to 5 recent runs in the quick switcher
  const recentRuns = sortedRuns.slice(0, 5);

  // Key navigation while dropdown is open
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      // Do not intercept if typing inside an input/textarea
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
      } else if (event.key.toLowerCase() === 'l') {
        if (latestRun) {
          event.preventDefault();
          event.stopPropagation();
          if (isViewingLatest) {
            onActiveRunSelected?.(latestRun);
          } else {
            onSelectRun(latestRun.run_id);
          }
          setIsOpen(false);
        }
      } else if (['1', '2', '3', '4', '5'].includes(event.key)) {
        const targetIndex = parseInt(event.key, 10) - 1;
        const targetRun = recentRuns[targetIndex];
        if (targetRun) {
          event.preventDefault();
          event.stopPropagation();
          if (targetRun.run_id === currentRunId) {
            onActiveRunSelected?.(targetRun);
          } else {
            onSelectRun(targetRun.run_id);
          }
          setIsOpen(false);
        }
      } else if (['6', '7', '8', '9', '0'].includes(event.key)) {
        // Prevent numeric keys from propagating outside the quick switcher menu
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    latestRun,
    isViewingLatest,
    onSelectRun,
    onActiveRunSelected,
    recentRuns,
    currentRunId,
  ]);

  // If there are no multiple runs to switch between, do not render a switcher button
  if (!hasMultipleRuns) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Switch test run (Click for quick menu or press / for full search)"
        className={`group inline-flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg border text-xs font-semibold leading-none shadow-2xs transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
          isOpen
            ? 'border-accent-blue bg-accent-blue/15 text-accent-blue'
            : 'border-accent-blue/35 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue hover:border-accent-blue/60'
        }`}
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 text-accent-blue"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Switch Run</span>
        <svg
          className={`h-3 w-3 shrink-0 text-accent-blue transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.25}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Test run quick switcher"
          className="absolute left-0 top-full mt-1.5 z-50 w-80 sm:w-96 rounded-lg border border-border-default bg-surface-50 dark:bg-surface-100 shadow-xl py-1.5 divide-y divide-border-default/60 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Quick jump to Latest Run if not already viewing it */}
          {latestRun && (
            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                disabled={isViewingLatest}
                onClick={() => {
                  if (!isViewingLatest) {
                    onSelectRun(latestRun.run_id);
                  } else {
                    onActiveRunSelected?.(latestRun);
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md transition-colors text-left ${
                  isViewingLatest
                    ? 'opacity-60 bg-surface-100/50 dark:bg-surface-200/30 cursor-default'
                    : 'bg-accent-blue/10 hover:bg-accent-blue/15 text-accent-blue font-semibold cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    className={`h-4 w-4 shrink-0 ${isViewingLatest ? 'text-text-muted' : 'text-accent-blue'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text-ink dark:text-text-on-primary truncate">
                        {isViewingLatest ? 'Currently viewing latest run' : 'Jump to Latest Run'}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted font-normal truncate">
                      {latestRun.run_name}
                    </div>
                  </div>
                </div>
                {isViewingLatest ? (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-200 text-text-body-mid">
                    Latest
                  </span>
                ) : (
                  <kbd className="hidden sm:inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1.5 text-[10px] font-medium leading-none text-accent-blue border border-accent-blue/40 bg-accent-blue/10">
                    L
                  </kbd>
                )}
              </button>
            </div>
          )}

          {/* Recent Runs list */}
          <div className="p-1.5">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-text-muted tracking-wider uppercase">
              Recent Executions
            </div>
            <div className="space-y-0.5 mt-0.5">
              {recentRuns.map((run, index) => {
                const isCurrent = run.run_id === currentRunId;
                const shortcutNumber = index + 1;
                const passRate = computePassRate({
                  total: run.run_total,
                  passed: run.run_passed,
                  failed: run.run_failed,
                  timedOut: run.run_timed_out,
                  skipped: run.run_skipped,
                  interrupted: run.run_interrupted,
                  duration: run.run_duration_ms,
                });

                return (
                  <button
                    key={run.run_id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (!isCurrent) {
                        onSelectRun(run.run_id);
                      } else {
                        onActiveRunSelected?.(run);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                      isCurrent
                        ? 'bg-accent-blue/10 text-accent-blue font-semibold cursor-default'
                        : 'hover:bg-surface-200/80 dark:hover:bg-surface-200 text-text-ink dark:text-text-on-primary cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{run.run_name}</span>
                        {run.run_id === latestRun?.run_id && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-surface-200 dark:bg-surface-300 text-text-muted shrink-0 leading-tight">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
                        {run.started_at && <span>{formatDate(run.started_at)}</span>}
                        {run.run_duration_ms > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(run.run_duration_ms)}</span>
                          </>
                        )}
                        {run.git_branch && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-28">{run.git_branch}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <PassRateBadge passRate={passRate} />
                      <kbd className="hidden sm:inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[9px] font-medium leading-none text-text-muted border border-border-default/60 bg-surface-100 dark:bg-surface-200/50">
                        {shortcutNumber}
                      </kbd>
                      {isCurrent && (
                        <svg
                          className="h-3.5 w-3.5 text-accent-blue shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer action: Open full switcher modal */}
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenFullModal();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-text-ink dark:text-text-on-primary hover:bg-surface-200/80 dark:hover:bg-surface-200 transition-colors font-medium cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-3.5 w-3.5 text-text-muted group-hover:text-text-ink dark:group-hover:text-text-on-primary transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Browse all {runs.length} runs & search...</span>
              </div>
              <kbd className="hidden sm:inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1.5 text-[10px] font-medium leading-none text-text-muted border border-border-default/60 bg-surface-100 dark:bg-surface-200/50">
                /
              </kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default HeaderRunSwitcher;
