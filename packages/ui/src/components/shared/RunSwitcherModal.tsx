import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BaseModal from '@/components/shared/BaseModal';
import SearchInput from '@/components/shared/SearchInput';
import { PassRateBadge } from '@/components/shared/PassRateBadge';
import Kbd from '@/components/shared/Kbd';
import { usePagination } from '@/components/pagination/usePagination';
import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import type { HistoryRun } from '@arpanp/zen-core';
import { formatDate, formatDuration, computePassRate } from '@arpanp/zen-core';

export interface RunSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: HistoryRun[];
  currentRunId: string | null;
  onSelectRun: (runId: string) => void;
  onActiveRunSelected?: (run: HistoryRun) => void;
}

/**
 * Modal dialog for searching and switching between historical test execution runs.
 *
 * @param props - Component properties for the Run Switcher modal.
 * @param props.isOpen - Whether the modal dialog is currently visible.
 * @param props.onClose - Callback triggered when the modal is requested to close.
 * @param props.runs - List of historical execution runs available to switch to.
 * @param props.currentRunId - Unique identifier of the currently active test run.
 * @param props.onSelectRun - Callback triggered when the user switches to a run.
 * @param props.onActiveRunSelected - Optional callback triggered when the user selects the currently active run.
 * @returns The rendered modal element, or null if isOpen is false.
 */
export default function RunSwitcherModal({
  isOpen,
  onClose,
  runs,
  currentRunId,
  onSelectRun,
  onActiveRunSelected,
}: RunSwitcherModalProps) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [searchTerm, setSearchTerm] = useState('');
  const modalContainerRef = useRef<HTMLDivElement>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSearchTerm('');
    }
  }

  const latestRunId = useMemo(() => {
    if (runs.length === 0) return null;
    return runs[runs.length - 1].run_id;
  }, [runs]);

  // Runs in reverse chronological order (newest first), with active run pinned to the very top
  const orderedRuns = useMemo(() => {
    const list = [...runs].reverse();
    if (!currentRunId) return list;

    const activeIdx = list.findIndex((r) => r.run_id === currentRunId);
    if (activeIdx <= 0) return list;

    const [activeRun] = list.splice(activeIdx, 1);
    return [activeRun, ...list];
  }, [runs, currentRunId]);

  const filteredRuns = useMemo(() => {
    if (!searchTerm.trim()) return orderedRuns;
    const query = searchTerm.trim().toLowerCase();

    return orderedRuns.filter((r) => {
      const nameMatch = Boolean(r.run_name && r.run_name.toLowerCase().includes(query));
      if (nameMatch) return true;

      const branchMatch = Boolean(r.git_branch && r.git_branch.toLowerCase().includes(query));
      if (branchMatch) return true;

      const commitMatch = Boolean(
        (r.git_commit && r.git_commit.toLowerCase().startsWith(query)) ||
        (r.git_commit_full && r.git_commit_full.toLowerCase().startsWith(query))
      );
      if (commitMatch) return true;

      if (!r.started_at) return false;

      try {
        const d = new Date(r.started_at);
        if (isNaN(d.getTime())) return false;

        const monthShort = d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase(); // "nov"
        const monthLong = d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase(); // "november"
        const dayStr = String(d.getDate()); // "3"
        const dayPadded = dayStr.padStart(2, '0'); // "03"
        const yearStr = String(d.getFullYear()); // "2026"

        const monthMatch = monthShort.startsWith(query) || monthLong.startsWith(query);
        const dayMatch = dayStr === query || dayPadded === query;
        const yearMatch = yearStr.startsWith(query) && query.length >= 2;

        return monthMatch || dayMatch || yearMatch;
      } catch {
        return false;
      }
    });
  }, [orderedRuns, searchTerm]);

  const pagination = usePagination(filteredRuns.length, 5);
  const pagedRuns = filteredRuns.slice(pagination.start, pagination.start + pagination.pageSize);

  const modalShortcuts = useMemo(() => {
    // When the first row is the currently active/viewing run, shortcuts [1]-[4] select the other switchable runs
    const switchableRunsCount = pagedRuns.filter((r) => r.run_id !== currentRunId).length;
    const list = [];
    if (switchableRunsCount > 0) {
      list.push({
        keyDesc: ['1', '…', String(switchableRunsCount)],
        label: 'select run',
      });
    }
    list.push({ keyDesc: 'L', label: 'latest' }, { keyDesc: 'F', label: 'search' });
    if (filteredRuns.length > pagination.pageSize) {
      list.push(
        { keyDesc: ['P', '←'], label: 'previous page' },
        { keyDesc: ['N', '→'], label: 'next page' }
      );
    }
    return list;
  }, [pagedRuns, currentRunId, filteredRuns.length, pagination.pageSize]);

  const handleSelect = useCallback(
    (runId: string) => {
      setSearchTerm('');
      pagination.setPage(1);
      onSelectRun(runId);
      onClose();
    },
    [onSelectRun, onClose, pagination]
  );

  // Local keyboard shortcuts inside RunSwitcherModal:
  // 'f' -> focus search input
  // 'l' -> jump to latest run
  // 'p' -> previous page
  // 'n' -> next page
  // '1'-'5' -> select run by position on current page
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if typing inside an input/textarea/editable element
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        const searchInput = modalContainerRef.current?.querySelector<HTMLInputElement>(
          'input[data-search-input="true"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (key === 'l') {
        if (latestRunId) {
          e.preventDefault();
          e.stopPropagation();
          if (latestRunId === currentRunId) {
            const activeRun = runs.find((r) => r.run_id === latestRunId);
            if (activeRun) {
              onActiveRunSelected?.(activeRun);
            }
            onClose();
          } else {
            handleSelect(latestRunId);
          }
        }
      } else if (['1', '2', '3', '4', '5'].includes(key)) {
        const pressedNum = parseInt(key, 10);
        // Find which run on the current page corresponds to this shortcut number
        // Only non-current (switchable) runs are assigned 1, 2, 3...
        const switchableRunsOnPage = pagedRuns.filter((r) => r.run_id !== currentRunId);
        const targetRun = switchableRunsOnPage[pressedNum - 1];

        if (targetRun) {
          e.preventDefault();
          e.stopPropagation();
          handleSelect(targetRun.run_id);
        } else if (pressedNum === 1 && pagedRuns.some((r) => r.run_id === currentRunId)) {
          // If 1 was pressed and current run is on page with no shortcut (or user pressed 1 thinking it was row 1), show toast without closing
          const activeRun = runs.find((r) => r.run_id === currentRunId);
          if (activeRun) {
            e.preventDefault();
            e.stopPropagation();
            onActiveRunSelected?.(activeRun);
          }
        }
      } else if (e.key === 'ArrowLeft' || key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        pagination.setPage(Math.max(1, pagination.currentPage - 1));
      } else if (e.key === 'ArrowRight' || key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        pagination.setPage(Math.min(pagination.totalPages, pagination.currentPage + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    pagination,
    latestRunId,
    currentRunId,
    handleSelect,
    pagedRuns,
    runs,
    onActiveRunSelected,
    onClose,
  ]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Switch Execution Run</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-200 text-text-body-mid border border-border-default">
            {runs.length} runs
          </span>
        </div>
      }
      subtitle="Select a previous test execution to view its complete dashboard, test suites, failures, and attachments."
      maxWidthClass="max-w-4xl"
      shortcuts={modalShortcuts}
    >
      <div ref={modalContainerRef} className="space-y-4">
        {/* Search */}
        <div className="flex items-center justify-between gap-3">
          <SearchInput
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              pagination.setPage(1);
            }}
            placeholder="Search runs by name, date, branch, or commit..."
            className="w-full"
          />
        </div>

        {/* Runs List Table */}
        <div className="overflow-hidden rounded-md border border-border-default bg-canvas shadow-xs">
          <div className="max-h-[50vh] overflow-y-auto divide-y divide-border-default">
            {pagedRuns.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-body-mid dark:text-text-muted italic">
                No runs match &quot;{searchTerm}&quot;
              </div>
            ) : (
              (() => {
                let switchableIndex = 0;
                return pagedRuns.map((run) => {
                  const isCurrent = currentRunId === run.run_id;
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
                      onClick={() => {
                        if (!isCurrent) {
                          handleSelect(run.run_id);
                        } else {
                          onActiveRunSelected?.(run);
                        }
                      }}
                      className={`group flex items-center justify-between gap-4 p-3.5 transition-colors ${
                        isCurrent
                          ? 'bg-accent-blue/5 border-l-4 border-l-accent-blue'
                          : 'hover:bg-surface-100 cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        {/* Row 1: Dedicated Run Title */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
                            {run.run_name}
                          </span>
                          {run.run_id === latestRunId && (
                            <>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-200 dark:bg-surface-300 text-text-muted shrink-0 leading-tight">
                                Latest
                              </span>
                              <Kbd
                                size="sm"
                                variant="keycap"
                                showKeyboardIcon
                                className="hidden sm:inline-flex"
                                title="Press L to jump to latest run"
                              >
                                L
                              </Kbd>
                            </>
                          )}
                        </div>

                        {/* Row 2: Git Metadata (Plain text with icons, no badges) */}
                        <div className="mt-1 flex items-center gap-3 text-xs text-text-body-mid dark:text-text-muted flex-wrap">
                          {run.git_branch ? (
                            <div
                              className="inline-flex items-center gap-1.5 max-w-xs truncate"
                              title={`Branch: ${run.git_branch}`}
                            >
                              <svg
                                className="h-3.5 w-3.5 text-accent-blue shrink-0"
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
                              <span className="truncate font-medium text-text-ink dark:text-text-on-primary">
                                {run.git_branch}
                              </span>
                            </div>
                          ) : null}

                          {run.git_commit && (
                            <div
                              className="inline-flex items-center gap-1.5 font-mono"
                              title={`Commit SHA: ${run.git_commit_full || run.git_commit}`}
                            >
                              <svg
                                className="h-3.5 w-3.5 text-accent-blue shrink-0"
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
                              <span className="font-semibold text-text-body-mid dark:text-text-on-primary">
                                {run.git_commit}
                              </span>
                            </div>
                          )}

                          {!run.git_branch && !run.git_commit && (
                            <span className="text-[11px] text-text-muted/70 italic select-none">
                              No git metadata
                            </span>
                          )}
                        </div>

                        {/* Row 3: Execution Telemetry (Timestamp, Duration, Test & Worker Counts) */}
                        <div className="mt-1 flex items-center gap-2 text-xs text-text-body-mid dark:text-text-muted flex-wrap">
                          <span>{formatDate(run.started_at)}</span>
                          <span>·</span>
                          <span>{formatDuration(run.run_duration_ms)}</span>
                          <span>·</span>
                          <span>{run.run_total} tests</span>
                          {run.run_workers && run.run_workers > 1 && (
                            <>
                              <span>·</span>
                              <span>{run.run_workers} workers</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Pass Rate & Action Button with Keyboard Shortcut Keycap */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-14 flex justify-end">
                          <PassRateBadge passRate={passRate} />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isCurrent}
                            className={`text-xs font-semibold w-20 py-1 rounded-md text-center inline-flex items-center justify-center transition-colors select-none ${
                              isCurrent
                                ? 'border border-border-default bg-surface-100 text-text-ink dark:bg-surface-200 dark:text-text-on-primary opacity-40 cursor-not-allowed'
                                : 'bg-surface-100 hover:bg-surface-200 text-accent-blue border border-border-default shadow-2xs cursor-pointer'
                            }`}
                          >
                            {isCurrent ? 'Viewing' : 'Switch'}
                          </button>
                          {/*
                            Keycap area is a constant 1-keycap width on every row. The numbered
                            shortcut is always rendered (visible on switchable runs, an invisible
                            placeholder on the Viewing run), so the area never changes width and
                            the Switch/Viewing button + Pass Rate badge stay vertically aligned.
                            The "L" shortcut now lives next to the "Latest" badge in the title row.
                          */}
                          <Kbd
                            size="sm"
                            variant="keycap"
                            showKeyboardIcon
                            className={`hidden sm:inline-flex ${
                              shortcutNumber === null ? 'opacity-0 pointer-events-none' : ''
                            }`}
                            aria-hidden={shortcutNumber === null ? true : undefined}
                            title={
                              shortcutNumber !== null
                                ? `Press ${shortcutNumber} to switch to this run`
                                : undefined
                            }
                          >
                            {shortcutNumber ?? '0'}
                          </Kbd>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* Pagination Footer */}
        {filteredRuns.length > pagination.pageSize && (
          <div className="pt-1">
            <PaginationFooter
              label="runs"
              total={filteredRuns.length}
              start={pagination.start}
              pageLength={pagedRuns.length}
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
            />
          </div>
        )}
      </div>
    </BaseModal>
  );
}
