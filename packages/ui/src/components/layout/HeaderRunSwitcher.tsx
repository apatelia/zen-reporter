import { useState, useRef, useEffect, useMemo } from 'react';
import type { HistoryRun } from '@arpanp/zen-core';
import { formatDate, formatDuration, computePassRate } from '@arpanp/zen-core';
import { PassRateBadge } from '@/components/shared/PassRateBadge';
import Kbd from '@/components/shared/Kbd';

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

  // Render active run at the top of the menu, followed by the latest remaining runs (up to 5 total)
  const recentRuns = useMemo(() => {
    if (!currentRunId) return sortedRuns.slice(0, 5);

    const activeIdx = sortedRuns.findIndex((r) => r.run_id === currentRunId);
    if (activeIdx === -1) {
      return sortedRuns.slice(0, 5);
    }

    const activeRun = sortedRuns[activeIdx];
    const otherRuns = sortedRuns.filter((r) => r.run_id !== currentRunId);
    return [activeRun, ...otherRuns].slice(0, 5);
  }, [sortedRuns, currentRunId]);

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
            setIsOpen(false);
          }
        }
      } else if (['1', '2', '3', '4', '5'].includes(event.key)) {
        const pressedNum = parseInt(event.key, 10);
        // Shortcuts 1-4 correspond to switchable (non-active) runs only
        const switchableRuns = recentRuns.filter((r) => r.run_id !== currentRunId);
        const targetRun = switchableRuns[pressedNum - 1];
        if (targetRun) {
          event.preventDefault();
          event.stopPropagation();
          onSelectRun(targetRun.run_id);
          setIsOpen(false);
        } else if (pressedNum === 1 && recentRuns.some((r) => r.run_id === currentRunId)) {
          // If 1 was pressed thinking it was row 1 (the active run), inform user without closing menu
          const activeRun = runs.find((r) => r.run_id === currentRunId);
          if (activeRun) {
            event.preventDefault();
            event.stopPropagation();
            onActiveRunSelected?.(activeRun);
          }
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
    runs,
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
          className="absolute left-0 top-full mt-1.5 z-50 w-80 sm:w-[28rem] rounded-lg border border-border-default bg-surface-50 dark:bg-surface-100 shadow-xl py-1.5 divide-y divide-border-default/60 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Recent Runs list */}
          <div className="p-1.5">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-text-muted tracking-wider uppercase">
              Recent Executions
            </div>
            <div className="space-y-1 mt-0.5">
              {(() => {
                let switchableIndex = 0;
                return recentRuns.map((run) => {
                  const isCurrent = run.run_id === currentRunId;
                  const shortcutNumber = !isCurrent ? ++switchableIndex : null;
                  const passRate = computePassRate({
                    total: run.run_total,
                    passed: run.run_passed,
                    flaky: run.run_flaky ?? 0,
                    failed: run.run_failed,
                    timedOut: run.run_timed_out,
                    skipped: run.run_skipped,
                    interrupted: run.run_interrupted,
                    duration: run.run_duration_ms,
                  });

                  return (
                    <div
                      key={run.run_id}
                      role="menuitem"
                      onClick={() => {
                        if (!isCurrent) {
                          onSelectRun(run.run_id);
                          setIsOpen(false);
                        } else {
                          onActiveRunSelected?.(run);
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                        isCurrent
                          ? 'bg-accent-blue/5 border-l-4 border-l-accent-blue cursor-default select-none'
                          : 'hover:bg-surface-200/80 dark:hover:bg-surface-200 text-text-ink dark:text-text-on-primary cursor-pointer'
                      }`}
                    >
                      {/* Left: 3-row layout */}
                      <div className="min-w-0 flex-1">
                        {/* Row 1: Run Name + Latest tag + Viewing tag */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`truncate font-semibold text-xs ${
                              isCurrent
                                ? 'text-accent-blue'
                                : 'text-text-ink dark:text-text-on-primary'
                            }`}
                          >
                            {run.run_name}
                          </span>
                          {run.run_id === latestRun?.run_id && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface-200 dark:bg-surface-300 text-text-body-mid dark:text-text-on-primary border border-border-default/80 shrink-0 leading-tight">
                              Latest
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-accent-blue/15 dark:bg-accent-blue/25 text-accent-blue dark:text-accent-blue border border-accent-blue/30 shrink-0 leading-tight">
                              Viewing
                            </span>
                          )}
                        </div>

                        {/* Row 2: Git Metadata (Branch & Commit) */}
                        <div className="mt-1 flex items-center gap-2.5 text-[11px]">
                          {run.git_branch ? (
                            <div
                              className="inline-flex items-center gap-1 max-w-[15rem] truncate text-text-ink dark:text-text-on-primary font-medium"
                              title={`Branch: ${run.git_branch}`}
                            >
                              <svg
                                className="h-3 w-3 text-accent-blue shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="6" y1="3" x2="6" y2="15" />
                                <circle cx="18" cy="6" r="3" />
                                <circle cx="6" cy="18" r="3" />
                                <path d="M18 9a9 9 0 0 1-9 9" />
                              </svg>
                              <span className="truncate">{run.git_branch}</span>
                            </div>
                          ) : null}

                          {run.git_commit && (
                            <div
                              className="inline-flex items-center gap-1 font-mono text-[10.5px] text-text-body-mid dark:text-text-muted"
                              title={`Commit SHA: ${run.git_commit_full || run.git_commit}`}
                            >
                              <svg
                                className="h-2.5 w-2.5 text-accent-blue shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="4" />
                                <line x1="12" y1="1.05" x2="12" y2="7" />
                                <line x1="12" y1="17.05" x2="12" y2="22.95" />
                              </svg>
                              <span>{run.git_commit}</span>
                            </div>
                          )}

                          {!run.git_branch && !run.git_commit && (
                            <span className="italic text-text-muted/60 text-[10.5px]">
                              No git metadata
                            </span>
                          )}
                        </div>

                        {/* Row 3: Telemetry (Timestamp, Duration, Test Count) */}
                        <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-text-muted flex-wrap">
                          {run.started_at && <span>{formatDate(run.started_at)}</span>}
                          {run.run_duration_ms > 0 && (
                            <>
                              <span>·</span>
                              <span>{formatDuration(run.run_duration_ms)}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{run.run_total} tests</span>
                        </div>
                      </div>

                      {/* Right: Pass Rate Badge + Shortcut Keycap */}
                      <div className="shrink-0 flex items-center gap-2">
                        <PassRateBadge passRate={passRate} />
                        {shortcutNumber !== null ? (
                          <Kbd
                            size="sm"
                            variant="keycap"
                            showKeyboardIcon
                            className="hidden sm:inline-flex"
                            title={`Press ${shortcutNumber} to switch to this run`}
                          >
                            {shortcutNumber}
                          </Kbd>
                        ) : (
                          <div className="hidden sm:block w-7.5" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Quick jump to Latest Run if NOT already viewing it */}
          {latestRun && !isViewingLatest && (
            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelectRun(latestRun.run_id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-surface-200/80 dark:hover:bg-surface-200 text-text-ink dark:text-text-on-primary transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-text-ink dark:text-text-on-primary">
                      Jump to Latest Run
                    </span>
                    <span className="text-[11px] text-text-muted ml-1.5 truncate">
                      ({latestRun.run_name})
                    </span>
                  </div>
                </div>
                <Kbd
                  size="sm"
                  variant="keycap"
                  showKeyboardIcon
                  className="hidden sm:inline-flex"
                  title="Press L to jump to latest run"
                >
                  L
                </Kbd>
              </button>
            </div>
          )}

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
              <Kbd
                size="sm"
                variant="keycap"
                showKeyboardIcon
                className="hidden sm:inline-flex"
                title="Press / to open full run search modal"
              >
                /
              </Kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default HeaderRunSwitcher;
