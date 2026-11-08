import { useEffect, useMemo, useRef, useState } from 'react';
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
}

export default function RunSwitcherModal({
  isOpen,
  onClose,
  runs,
  currentRunId,
  onSelectRun,
}: RunSwitcherModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const modalContainerRef = useRef<HTMLDivElement>(null);

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

  // Local keyboard shortcuts inside RunSwitcherModal:
  // 'f' -> focus search input
  // 'p' -> previous page
  // 'n' -> next page
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
      } else if (key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        pagination.setPage(Math.max(1, pagination.currentPage - 1));
      } else if (key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        pagination.setPage(Math.min(pagination.totalPages, pagination.currentPage + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pagination]);

  const handleSelect = (runId: string) => {
    setSearchTerm('');
    pagination.setPage(1);
    onSelectRun(runId);
    onClose();
  };

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
      maxWidthClass="max-w-3xl"
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
              pagedRuns.map((run) => {
                const isCurrent = currentRunId === run.run_id;
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
                      }
                    }}
                    className={`flex items-center justify-between gap-4 p-3.5 transition-colors ${
                      isCurrent
                        ? 'bg-accent-blue/5 border-l-4 border-l-accent-blue'
                        : 'hover:bg-surface-100 cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-text-ink dark:text-text-on-primary truncate">
                          {run.run_name}
                        </span>
                        {run.git_branch && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-surface-100 dark:bg-surface-200 border border-border-default px-2 py-0.5 text-[10px] font-semibold text-text-ink dark:text-text-on-primary max-w-40 truncate shadow-2xs"
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
                        )}
                        {run.git_commit && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-border-default bg-surface-100 dark:bg-surface-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-text-ink dark:text-text-on-primary shadow-2xs"
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
                              <line x1="1.05" y1="12" x2="7" y2="12" />
                              <line x1="17.05" y1="12" x2="22.95" y2="12" />
                            </svg>
                            <span>{run.git_commit}</span>
                          </span>
                        )}
                      </div>
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
