import { useState, useMemo } from 'react';
import type { ProjectStats } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import { LearnMoreButton, TestCaseCard } from '@/components/shared';

interface Props {
  projectStats: ProjectStats[];
}

type SortOption = 'passRate' | 'duration' | 'flakiness' | 'total' | 'name';

export default function ProjectDetailCards({ projectStats }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('passRate');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <div className="w-full rounded-lg bg-canvas border border-border-default p-5 shadow-sm space-y-4">
      {/* Cohesive Section Header & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-default pb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary shrink-0">
            Project Health & Breakdown
          </h3>
          <span className="rounded-full bg-surface-100 dark:bg-surface-100 px-2.5 py-0.5 text-xs font-semibold text-text-body-mid dark:text-text-muted border border-border-default">
            {filteredAndSortedProjects.length} Projects
          </span>
          <LearnMoreButton onClick={() => setIsModalOpen(true)} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-50 flex-1 sm:flex-initial">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-border-default bg-surface-50 pl-9 pr-3 py-1.5 text-xs text-text-ink placeholder:text-text-muted focus:border-accent-blue focus:outline-none dark:bg-surface-50 dark:text-text-on-primary"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="project-sort-select"
              className="text-xs text-text-body-mid dark:text-text-muted shrink-0 font-medium"
            >
              Sort by:
            </label>
            <select
              id="project-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-md border border-border-default bg-surface-50 px-2.5 py-1.5 text-xs text-text-ink focus:border-accent-blue focus:outline-none dark:bg-surface-50 dark:text-text-on-primary font-medium"
            >
              <option value="passRate">Highest Pass Rate</option>
              <option value="duration">Longest Duration</option>
              <option value="flakiness">Most Flaky Tests</option>
              <option value="total">Most Tests</option>
              <option value="name">Project Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 gap-4 pt-1">
        {filteredAndSortedProjects.map((project) => {
          const isExpanded = Boolean(expandedProjects[project.name]);
          const failingOrSlowCases = project.cases.filter(
            (c) => c.status === 'failed' || c.status === 'timedOut' || c.status === 'interrupted'
          );

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
              className="rounded-md bg-surface-50/50 border border-border-default shadow-xs transition-all duration-150 overflow-hidden"
            >
              {/* Card Main Header */}
              <div className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 border border-border-default shrink-0">
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
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-500 shrink-0 border border-warning-500/20"
                          title={`Average test duration is ${project.speedMultiplier}x relative to overall run average`}
                        >
                          ⚡ {project.speedMultiplier}x speed factor
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
                      {project.passed}/{project.total}
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
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 text-xs">
                  {/* Status Breakdown Pills */}
                  <div className="rounded bg-canvas border border-border-default px-3 py-2">
                    <span className="text-[10px] font-semibold text-text-muted uppercase block">
                      Status Breakdown
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap font-medium">
                      <span className="text-success-600 dark:text-success-500">
                        {project.passed} Pass
                      </span>
                      {project.failed > 0 && (
                        <span className="text-danger-600 dark:text-danger-500">
                          • {project.failed} Fail
                        </span>
                      )}
                      {project.timedOut > 0 && (
                        <span className="text-warning-600 dark:text-warning-500">
                          • {project.timedOut} Timeout
                        </span>
                      )}
                      {project.skipped > 0 && (
                        <span className="text-text-muted">• {project.skipped} Skip</span>
                      )}
                    </div>
                  </div>

                  {/* Duration & Latency */}
                  <div className="rounded bg-canvas border border-border-default px-3 py-2">
                    <span className="text-[10px] font-semibold text-text-muted uppercase block">
                      Total Duration
                    </span>
                    <span className="mt-1 font-bold text-text-ink dark:text-text-on-primary block">
                      {formatDuration(project.totalDuration)}
                    </span>
                  </div>

                  <div className="rounded bg-canvas border border-border-default px-3 py-2">
                    <span className="text-[10px] font-semibold text-text-muted uppercase block">
                      Avg / Test
                    </span>
                    <span className="mt-1 font-bold text-text-ink dark:text-text-on-primary block">
                      {formatDuration(project.avgDuration)}
                    </span>
                  </div>

                  <div className="rounded bg-canvas border border-border-default px-3 py-2">
                    <span className="text-[10px] font-semibold text-text-muted uppercase block">
                      P95 Latency
                    </span>
                    <span className="mt-1 font-bold text-text-ink dark:text-text-on-primary block">
                      {formatDuration(project.p95Duration)}
                    </span>
                  </div>

                  {/* Flakiness */}
                  <div className="rounded bg-canvas border border-border-default px-3 py-2">
                    <span className="text-[10px] font-semibold text-text-muted uppercase block">
                      Flaky / Retries
                    </span>
                    <span
                      className={`mt-1 font-bold block ${
                        project.flakyCount > 0
                          ? 'text-warning-600 dark:text-warning-500'
                          : 'text-text-ink dark:text-text-on-primary'
                      }`}
                    >
                      {project.flakyCount} ({project.flakyRate}%)
                    </span>
                  </div>

                  {/* Scope / Tags */}
                  <div className="rounded bg-canvas border border-border-default px-3 py-2">
                    <span className="text-[10px] font-semibold text-text-muted uppercase block">
                      Scope & Tags
                    </span>
                    <span className="mt-1 font-bold text-text-ink dark:text-text-on-primary block">
                      {project.uniqueFiles} Files / {project.uniqueTagsCount} Tags
                    </span>
                  </div>
                </div>

                {/* Expand Toggle for Failing/Slow Tests */}
                {failingOrSlowCases.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border-default flex items-center justify-between">
                    <span className="text-xs font-semibold text-danger-600 dark:text-danger-500 flex items-center gap-1.5">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                      </svg>
                      {failingOrSlowCases.length} Failing / Timed Out test(s) in {project.name}
                    </span>

                    <button
                      onClick={() => toggleExpand(project.name)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-blue hover:underline cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Failures' : 'View Failures'}</span>
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

      {/* Learn More Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-lg border border-border-default bg-canvas p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border-default pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-text-ink dark:text-text-on-primary">
                  Project Health & Breakdown Guide
                </h3>
                <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
                  Understanding project metrics, performance distributions, and diagnostic controls
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors cursor-pointer"
                title="Close guide"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
              <p>
                The{' '}
                <strong className="text-text-ink dark:text-text-on-primary">
                  Project Health & Breakdown
                </strong>{' '}
                panel provides granular execution metrics scoped to each configured Playwright
                project profile (e.g., cross-browser targets like Chromium, Firefox, WebKit, or
                custom test configurations).
              </p>

              <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2.5">
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
                  Key Metrics & Health Indicators:
                </div>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>
                    <strong>Pass Rate:</strong> Percentage of test cases in the project profile that
                    executed cleanly to completion.
                  </li>
                  <li>
                    <strong>Execution Duration:</strong> Cumulative runtime and average duration per
                    test case within the project target.
                  </li>
                  <li>
                    <strong>Duration Percentiles (p95, Median, Min, Max):</strong> Detailed timing
                    stats to identify long-tail execution bottlenecks across specs.
                  </li>
                  <li>
                    <strong>Retries & In-Run Flakiness:</strong> Count and percentage of test cases
                    that failed on initial attempt but succeeded after automatic retries.
                  </li>
                </ul>
              </div>

              <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2.5">
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
                  Diagnostic Controls & Deep Dives:
                </div>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>
                    <strong>Search & Sort:</strong> Quickly filter project profiles by name or sort
                    by Pass Rate, Cumulative Duration, Retry Count, or Total Test Volume.
                  </li>
                  <li>
                    <strong>Expandable Failure Details:</strong> Click any project card with errors
                    to expand and inspect step-by-step logs, stack traces, snippets, and attachments
                    scoped strictly to that project target.
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border-default pt-3.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md bg-accent-blue px-4 py-2 text-xs font-bold text-text-on-primary hover:bg-accent-blue/90 transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
