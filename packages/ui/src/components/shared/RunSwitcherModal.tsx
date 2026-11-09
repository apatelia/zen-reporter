import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BaseModal from '@/components/shared/BaseModal';
import SearchInput from '@/components/shared/SearchInput';
import { PassRateBadge } from '@/components/shared/PassRateBadge';
import { StatusCountBadge } from '@/components/shared/StatusCountBadge';
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
    const list = [
      {
        keyDesc: ['1', '…', String(Math.min(5, pagedRuns.length || 1))],
        label: 'select run',
      },
      { keyDesc: 'L', label: 'latest' },
      { keyDesc: 'F', label: 'search' },
    ];
    if (filteredRuns.length > pagination.pageSize) {
      list.push(
        { keyDesc: ['P', '←'], label: 'previous page' },
        { keyDesc: ['N', '→'], label: 'next page' }
      );
    }
    return list;
  }, [pagedRuns.length, filteredRuns.length, pagination.pageSize]);

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
        const targetIndex = parseInt(key, 10) - 1;
        const targetRun = pagedRuns[targetIndex];
        if (targetRun) {
          e.preventDefault();
          e.stopPropagation();
          if (targetRun.run_id === currentRunId) {
            onActiveRunSelected?.(targetRun);
            onClose();
          } else {
            handleSelect(targetRun.run_id);
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
              pagedRuns.map((run, index) => {
                const isCurrent = currentRunId === run.run_id;
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
                  <div
                    key={run.run_id}
                    onClick={() => {
                      if (!isCurrent) {
                        handleSelect(run.run_id);
                      } else {
                        onActiveRunSelected?.(run);
                        onClose();
                      }
                    }}
                    className={`flex items-center justify-between gap-4 p-3.5 transition-colors ${
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
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-200 dark:bg-surface-300 text-text-muted shrink-0 leading-tight">
                            Latest
                          </span>
                        )}
                      </div>

                      {/* Row 2: Git Metadata Pills */}
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        {run.git_branch ? (
                          <>
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-surface-100 dark:bg-surface-200 border border-border-default/80 px-1.5 py-0.5 text-[10px] font-semibold text-text-ink dark:text-text-on-primary max-w-xs truncate shadow-2xs leading-none"
                              title={`Branch: ${run.git_branch}`}
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
                                <line x1="6" y1="3" x2="6" y2="15" />
                                <circle cx="18" cy="6" r="3" />
                                <circle cx="6" cy="18" r="3" />
                                <path d="M18 9a9 9 0 0 1-9 9" />
                              </svg>
                              <span className="truncate">{run.git_branch}</span>
                            </span>
                            {run.git_commit && (
                              <span
                                className="inline-flex items-center gap-1 rounded-md border border-border-default/80 bg-surface-100 dark:bg-surface-200 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-text-ink dark:text-text-on-primary shadow-2xs leading-none"
                                title={`Commit SHA: ${run.git_commit_full || run.git_commit}`}
                              >
                                <svg
                                  className="h-2.5 w-2.5 text-text-muted shrink-0"
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
                              </span>
                            )}
                          </>
                        ) : run.git_commit ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md border border-border-default/80 bg-surface-100 dark:bg-surface-200 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-text-ink dark:text-text-on-primary shadow-2xs leading-none"
                            title={`Commit SHA: ${run.git_commit_full || run.git_commit}`}
                          >
                            <svg
                              className="h-2.5 w-2.5 text-text-muted shrink-0"
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
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-100/60 dark:bg-surface-200/40 border border-border-default/50 px-1.5 py-0.5 text-[10px] text-text-muted italic leading-none select-none">
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

                    {/* Status & Pass Rate Badges */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center justify-end gap-1.5 w-24">
                        {run.run_passed > 0 && (
                          <StatusCountBadge count={run.run_passed} type="passed" />
                        )}
                        {run.run_failed > 0 && (
                          <StatusCountBadge count={run.run_failed} type="failed" />
                        )}
                        {run.run_timed_out > 0 && (
                          <StatusCountBadge count={run.run_timed_out} type="timedOut" />
                        )}
                        {run.run_passed === 0 &&
                          run.run_failed === 0 &&
                          run.run_timed_out === 0 && (
                            <StatusCountBadge count={0} type="passed" showZeroBadge />
                          )}
                      </div>
                      <div className="w-14 flex justify-end">
                        <PassRateBadge passRate={passRate} />
                      </div>
                      <div className="flex items-center gap-1">
                        {run.run_id === latestRunId && (
                          <kbd
                            className="hidden sm:inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1.5 text-[10px] font-medium leading-none text-accent-blue border border-accent-blue/40 bg-accent-blue/10"
                            title="Shortcut key: L (jump to latest run)"
                          >
                            L
                          </kbd>
                        )}
                        <kbd
                          className="hidden sm:inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1.5 text-[10px] font-medium leading-none text-text-muted border border-border-default/60 bg-surface-100 dark:bg-surface-200/50"
                          title={`Shortcut key: ${shortcutNumber}`}
                        >
                          {shortcutNumber}
                        </kbd>
                      </div>
                      <button
                        type="button"
                        disabled={isCurrent}
                        className={`text-xs font-semibold w-20 py-1 rounded-md text-center inline-flex items-center justify-center transition-colors ${
                          isCurrent
                            ? 'bg-surface-200 text-text-muted cursor-default'
                            : 'bg-surface-100 hover:bg-surface-200 text-accent-blue border border-border-default shadow-2xs'
                        }`}
                      >
                        {isCurrent ? 'Viewing' : 'Switch ↗'}
                      </button>
                    </div>
                  </div>
                );
              })
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
