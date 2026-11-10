import { useState, useMemo, useRef, useEffect } from 'react';
import type { ProjectStats } from '@arpanp/zen-core';
import { formatDuration } from '@arpanp/zen-core';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import TestCaseCard from '@/components/shared/TestCaseCard';
import SearchInput from '@/components/shared/SearchInput';

export interface ProjectDetailCardsProps {
  projectStats: ProjectStats[];
  onOpenGuide: () => void;
}

type SortOption = 'passRate' | 'duration' | 'flakiness' | 'total' | 'name';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'passRate', label: 'Highest Pass Rate' },
  { value: 'duration', label: 'Longest Duration' },
  { value: 'flakiness', label: 'Most Flaky Tests' },
  { value: 'total', label: 'Most Tests' },
  { value: 'name', label: 'Project Name' },
];

export default function ProjectDetailCards({ projectStats, onOpenGuide }: ProjectDetailCardsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('passRate');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortContainerRef = useRef<HTMLDivElement>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isSortOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (sortContainerRef.current && !sortContainerRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSortOpen]);

  const toggleExpand = (name: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const filteredAndSortedProjects = useMemo(() => {
    let list = projectStats.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );

    list = [...list].sort((a, b) => {
      if (sortBy === 'passRate') {
        if (b.passRate !== a.passRate) return b.passRate - a.passRate;
        return a.flakyRate - b.flakyRate;
      }
      if (sortBy === 'duration') {
        return b.totalDuration - a.totalDuration;
      }
      if (sortBy === 'flakiness') {
        return b.flakyCount - a.flakyCount;
      }
      if (sortBy === 'total') {
        return b.total - a.total;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [projectStats, searchTerm, sortBy]);

  return (
    <div className="w-full rounded-md bg-surface-50 border border-border-default p-5 shadow-xs space-y-4">
      {/* Cohesive Section Header & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-default pb-4">
        <div>
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary shrink-0">
              Project Health & Breakdown
            </h3>
            {projectStats.length > 0 && (
              <span className="rounded-full bg-surface-100 dark:bg-surface-100 px-2.5 py-0.5 text-xs font-semibold text-text-body-mid dark:text-text-muted border border-border-default">
                {filteredAndSortedProjects.length} Projects
              </span>
            )}
            <LearnMoreButton onClick={onOpenGuide} />
          </div>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            Detailed performance metrics, pass rates, and failure breakdowns per project target
          </p>
        </div>

        {projectStats.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search projects by project name..."
              className="w-full sm:w-80 md:w-80 flex-1 sm:flex-initial"
            />

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-body-mid dark:text-text-muted shrink-0 font-medium">
                Sort by:
              </span>
              <div ref={sortContainerRef} className="relative inline-flex items-center shrink-0">
                <button
                  type="button"
                  id="project-sort-button"
                  onClick={() => setIsSortOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={isSortOpen}
                  aria-label="Sort projects"
                  className={`group inline-flex items-center justify-between gap-2 h-7.5 min-w-37.5 px-2.5 rounded-lg border text-xs font-medium leading-none shadow-2xs transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                    isSortOpen
                      ? 'border-accent-blue bg-accent-blue/15 text-accent-blue'
                      : 'border-border-default bg-surface-100 hover:bg-surface-200/80 text-text-ink dark:bg-surface-200 dark:text-text-on-primary hover:border-border-default'
                  }`}
                >
                  <span className="truncate">
                    {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? 'Sort'}
                  </span>
                  <svg
                    className={`h-3 w-3 shrink-0 text-text-body-mid dark:text-text-muted transition-transform duration-150 ${
                      isSortOpen ? 'rotate-180 text-accent-blue' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isSortOpen && (
                  <div
                    role="menu"
                    aria-label="Project sort options"
                    className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-lg border border-border-default bg-surface-50 dark:bg-surface-100 shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = sortBy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setSortBy(opt.value);
                            setIsSortOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-accent-blue/10 text-accent-blue font-semibold'
                              : 'text-text-ink dark:text-text-on-primary hover:bg-surface-100 dark:hover:bg-surface-200 font-medium'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && (
                            <svg
                              className="h-3.5 w-3.5 text-accent-blue shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {projectStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-200 text-text-muted">
            <svg
              className="h-5 w-5 text-text-body-mid dark:text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M3.75 4.5h16.5m-16.5 3.75h16.5"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-ink dark:text-text-on-primary">
            No project data available for current run
          </p>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            No test cases were executed or matched the criteria.
          </p>
        </div>
      ) : filteredAndSortedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-200 text-text-muted">
            <svg
              className="h-5 w-5 text-text-body-mid dark:text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M3.75 4.5h16.5m-16.5 3.75h16.5"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-ink dark:text-text-on-primary">
            No matching projects found
          </p>
        </div>
      ) : (
        /* Projects Cards Grid */
        <div className="grid grid-cols-1 gap-4 pt-1">
          {filteredAndSortedProjects.map((project) => {
            const isExpanded = Boolean(expandedProjects[project.name]);
            const failingOrSlowCases = project.cases.filter(
              (c) => c.status === 'failed' || c.status === 'timedOut' || c.status === 'interrupted'
            );

            const speedBadge =
              project.speedMultiplier > 1.0
                ? {
                    label: `⚡ ${project.speedMultiplier}x slower than avg`,
                    color:
                      'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-500 border-warning-500/40 dark:border-warning-500/30',
                    tooltip: `Average test duration is ${project.speedMultiplier}x longer than overall run average`,
                  }
                : project.speedMultiplier < 1.0
                  ? {
                      label: `⚡ ${project.speedMultiplier}x faster than avg`,
                      color:
                        'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-500 border-success-500/40 dark:border-success-500/30',
                      tooltip: `Average test duration is ${project.speedMultiplier}x shorter than overall run average`,
                    }
                  : {
                      label: '⚡ 1.0x avg speed',
                      color:
                        'bg-surface-100/80 text-text-body-mid dark:text-text-muted border-border-chart dark:border-border-default',
                      tooltip: 'Average test duration matches overall run average',
                    };

            // Pass rate styling
            const passRateColor =
              project.passRate >= 90
                ? 'text-success-600 dark:text-success-500 bg-success-50 dark:bg-success-500/20'
                : project.passRate >= 75
                  ? 'text-warning-600 dark:text-warning-500 bg-warning-50 dark:bg-warning-500/20'
                  : 'text-danger-600 dark:text-danger-500 bg-danger-50 dark:bg-danger-500/20';

            const progressBarColor =
              project.passRate >= 90
                ? 'bg-success-500'
                : project.passRate >= 75
                  ? 'bg-warning-500'
                  : 'bg-danger-500';

            return (
              <div
                key={project.name}
                className="rounded-md bg-surface-100/60 dark:bg-surface-100/40 border border-border-default shadow-xs transition-all duration-150 overflow-hidden"
              >
                {/* Card Main Header */}
                <div className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-200 border border-border-default shrink-0">
                        <svg
                          className="h-5 w-5 text-accent-blue"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.414 8.586l-2.828 5.657-5.657 2.828 2.828-5.657 5.657-2.828z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-text-ink dark:text-text-on-primary flex items-center gap-2">
                          <span>{project.name}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 border ${speedBadge.color}`}
                            title={speedBadge.tooltip}
                          >
                            {speedBadge.label}
                          </span>
                        </h4>
                        <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                          {project.total} Tests executed across {project.uniqueFiles} spec files
                        </p>
                      </div>
                    </div>

                    {/* Pass Rate Badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col justify-center h-10 text-right">
                        <span className="text-[11px] font-medium leading-tight text-text-body-mid dark:text-text-muted block">
                          Pass Rate
                        </span>
                        <span className="text-base font-extrabold leading-tight text-text-ink dark:text-text-on-primary block">
                          {project.passRate}%
                        </span>
                      </div>
                      <div
                        className={`flex h-10 min-w-14 items-center justify-center rounded-md px-3 font-bold text-sm ${passRateColor}`}
                      >
                        {project.passed + project.flakyCount}/{project.total}
                      </div>
                    </div>
                  </div>

                  {/* Pass Rate Progress Bar */}
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-200">
                    <div
                      className={`h-full ${progressBarColor} transition-all duration-300`}
                      style={{ width: `${project.passRate}%` }}
                    />
                  </div>

                  {/* Status & Performance Metrics Pills Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
                    {/* Status Breakdown Pills */}
                    <div className="rounded-md bg-canvas dark:bg-canvas border border-border-default px-3 py-2 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-text-muted uppercase block">
                        Status Breakdown
                      </span>
                      <div className="mt-1 space-y-0.5 font-medium leading-tight">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-success-600 dark:text-success-500 font-bold">
                            {project.passed} Passed
                          </span>
                          {project.flakyCount > 0 && (
                            <span className="text-warning-600 dark:text-warning-500 font-bold">
                              • {project.flakyCount} Flaky
                            </span>
                          )}
                          {project.skipped > 0 && (
                            <span className="text-text-muted">• {project.skipped} Skipped</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          {project.failed === 0 &&
                          project.timedOut === 0 &&
                          project.interrupted === 0 ? (
                            <span className="text-text-muted text-[11px]">0 Failures</span>
                          ) : (
                            <>
                              {project.failed > 0 && (
                                <span className="text-danger-600 dark:text-danger-500 font-bold">
                                  {project.failed} Failed
                                </span>
                              )}
                              {project.timedOut > 0 && (
                                <span className="text-warning-600 dark:text-warning-500 font-bold">
                                  {project.failed > 0 ? '• ' : ''}
                                  {project.timedOut} Timed Out
                                </span>
                              )}
                              {project.interrupted > 0 && (
                                <span className="text-amber-600 dark:text-amber-500 font-bold">
                                  {project.failed > 0 || project.timedOut > 0 ? '• ' : ''}
                                  {project.interrupted} Interrupted
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Duration & Latency */}
                    <div className="rounded-md bg-canvas dark:bg-canvas border border-border-default px-3 py-2 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-text-muted uppercase block">
                        Total Duration
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-text-ink dark:text-text-on-primary block leading-tight">
                          {formatDuration(project.totalDuration)}
                        </span>
                        <span className="text-[11px] text-text-muted block leading-tight mt-0.5">
                          Cumulative
                        </span>
                      </div>
                    </div>

                    <div className="rounded-md bg-canvas dark:bg-canvas border border-border-default px-3 py-2 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-text-muted uppercase block">
                        Avg / Test
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-text-ink dark:text-text-on-primary block leading-tight">
                          {formatDuration(project.avgDuration)}
                        </span>
                        <span className="text-[11px] text-text-muted block leading-tight mt-0.5">
                          Per executed
                        </span>
                      </div>
                    </div>

                    <div className="rounded-md bg-canvas dark:bg-canvas border border-border-default px-3 py-2 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-text-muted uppercase block">
                        P95 Latency
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-text-ink dark:text-text-on-primary block leading-tight">
                          {formatDuration(project.p95Duration)}
                        </span>
                        <span className="text-[11px] text-text-muted block leading-tight mt-0.5">
                          95th percentile
                        </span>
                      </div>
                    </div>

                    {/* Flakiness */}
                    <div className="rounded-md bg-canvas dark:bg-canvas border border-border-default px-3 py-2 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-text-muted uppercase block">
                        Flaky / Retries
                      </span>
                      <div className="mt-1">
                        <span
                          className={`font-bold block leading-tight ${
                            project.flakyCount > 0
                              ? 'text-warning-600 dark:text-warning-500'
                              : 'text-text-ink dark:text-text-on-primary'
                          }`}
                        >
                          {project.flakyCount} Flaky
                        </span>
                        <span className="text-[11px] text-text-muted block leading-tight mt-0.5">
                          {project.flakyRate}% Flaky Rate
                        </span>
                      </div>
                    </div>

                    {/* Scope & Tags */}
                    <div className="rounded-md bg-canvas dark:bg-canvas border border-border-default px-3 py-2 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-text-muted uppercase block">
                        Scope & Tags
                      </span>
                      <div className="mt-1">
                        <span className="font-bold text-text-ink dark:text-text-on-primary block leading-tight">
                          {project.uniqueFiles} {project.uniqueFiles === 1 ? 'File' : 'Files'}
                        </span>
                        <span className="text-[11px] text-text-muted block leading-tight mt-0.5">
                          {project.uniqueTagsCount} {project.uniqueTagsCount === 1 ? 'Tag' : 'Tags'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand Toggle for Failing/Slow Tests */}
                  {failingOrSlowCases.length > 0 && (
                    <div className="mt-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(project.name)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors cursor-pointer"
                      >
                        <svg
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                        <span>{isExpanded ? 'Hide Failures' : 'View Failures'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Expandable Failure Cases Container */}
                {isExpanded && failingOrSlowCases.length > 0 && (
                  <div className="bg-canvas border-t border-border-default p-4 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                      Failed / Timed Out Cases in {project.name}
                    </h5>
                    <div className="space-y-2">
                      {failingOrSlowCases.map((tc) => (
                        <TestCaseCard
                          key={`${tc.project}-${tc.fileName}-${tc.title}`}
                          testCase={tc}
                          showSteps={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
