import type { TestSuite } from '@/lib/types/report';
import { useMemo, useState } from 'react';
import MultiSelectFilter, { FilterCountBadge } from '@/components/shared/MultiSelectFilter';
import StatCard from '@/components/shared/StatCard';
import SearchInput from '@/components/shared/SearchInput';
import TagCloudModal from '@/components/shared/TagCloudModal';
import type { TagCloudOption } from '@/components/shared/TagCloudModal';
import SuiteView from './SuiteView';

type TestCaseStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';

export interface SuitesSectionProps {
  suites: TestSuite[];
}

function getAllStatuses(suites: TestSuite[]): TestCaseStatus[] {
  const statusSet = new Set<TestCaseStatus>();

  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      statusSet.add(c.status);
    }
    for (const sub of suite.subSuites || []) {
      collect(sub);
    }
  }

  for (const suite of suites) {
    collect(suite);
  }

  const statusOrder: TestCaseStatus[] = ['passed', 'failed', 'skipped', 'timedOut', 'interrupted'];
  return statusOrder.filter((s) => statusSet.has(s));
}

function getAllProjects(suites: TestSuite[]): string[] {
  const projectSet = new Set<string>();

  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      projectSet.add(c.project);
    }
    for (const sub of suite.subSuites || []) {
      collect(sub);
    }
  }

  for (const suite of suites) {
    collect(suite);
  }

  return Array.from(projectSet).sort();
}

function countTotalCases(suites: TestSuite[]): number {
  let count = 0;

  function collect(suite: TestSuite) {
    count += suite.cases.length;
    for (const sub of suite.subSuites || []) {
      collect(sub);
    }
  }

  for (const suite of suites) {
    collect(suite);
  }

  return count;
}

function getAllTagsWithCounts(suites: TestSuite[]): TagCloudOption[] {
  const countsMap = new Map<string, number>();

  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      for (const tag of c.tags || []) {
        countsMap.set(tag, (countsMap.get(tag) || 0) + 1);
      }
    }
    for (const sub of suite.subSuites || []) {
      collect(sub);
    }
  }

  for (const suite of suites) {
    collect(suite);
  }

  return Array.from(countsMap.entries()).map(([tag, count]) => ({ tag, count }));
}

function hasTestCases(
  suite: TestSuite,
  filterStatuses: TestCaseStatus[],
  filterProjects: string[],
  filterTags: string[],
  fileSearchTerm: string,
  parentMatch: boolean = false
): boolean {
  if (
    filterStatuses.length === 0 &&
    filterProjects.length === 0 &&
    filterTags.length === 0 &&
    !fileSearchTerm.trim()
  )
    return true;

  const query = fileSearchTerm.trim().toLowerCase();
  const currentSuiteMatch =
    parentMatch || Boolean(query && suite.title && suite.title.toLowerCase().includes(query));

  const hasMatchingCases = suite.cases.some((c) => {
    const statusMatch = filterStatuses.length === 0 || filterStatuses.includes(c.status);
    const projectMatch = filterProjects.length === 0 || filterProjects.includes(c.project);
    const tagMatch =
      filterTags.length === 0 || (c.tags || []).some((tag) => filterTags.includes(tag));
    const fileMatch =
      !query ||
      currentSuiteMatch ||
      (c.fileName && c.fileName.toLowerCase().includes(query)) ||
      (c.title && c.title.toLowerCase().includes(query));

    return statusMatch && projectMatch && tagMatch && fileMatch;
  });

  if (hasMatchingCases) return true;

  for (const sub of suite.subSuites || []) {
    if (
      hasTestCases(
        sub,
        filterStatuses,
        filterProjects,
        filterTags,
        fileSearchTerm,
        currentSuiteMatch
      )
    )
      return true;
  }

  return false;
}

function filterSuites(
  suites: TestSuite[],
  filterStatuses: TestCaseStatus[],
  filterProjects: string[],
  filterTags: string[],
  fileSearchTerm: string
): TestSuite[] {
  if (
    filterStatuses.length === 0 &&
    filterProjects.length === 0 &&
    filterTags.length === 0 &&
    !fileSearchTerm.trim()
  )
    return suites;
  return suites.filter((suite) =>
    hasTestCases(suite, filterStatuses, filterProjects, filterTags, fileSearchTerm)
  );
}

export default function SuitesSection({ suites }: SuitesSectionProps) {
  const [filterStatuses, setFilterStatuses] = useState<TestCaseStatus[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [fileSearchTerm, setFileSearchTerm] = useState<string>('');
  const [openSuites, setOpenSuites] = useState<Record<string, boolean>>({});
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);
  const [expandKey, setExpandKey] = useState(0);

  const availableStatuses = useMemo(() => getAllStatuses(suites), [suites]);
  const availableProjects = useMemo(() => getAllProjects(suites), [suites]);
  const totalTestCases = useMemo(() => countTotalCases(suites), [suites]);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const availableTagsWithCounts = useMemo(() => getAllTagsWithCounts(suites), [suites]);
  const tagList = useMemo(
    () => availableTagsWithCounts.map((t) => t.tag),
    [availableTagsWithCounts]
  );

  const handleStatusApply = (statuses: TestCaseStatus[]) => {
    setFilterStatuses(statuses);
  };

  const handleProjectApply = (projects: string[]) => {
    setFilterProjects(projects);
  };

  const handleTagsApply = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const hasActiveFilters =
    filterStatuses.length > 0 ||
    filterProjects.length > 0 ||
    selectedTags.length > 0 ||
    fileSearchTerm.trim().length > 0;

  const handleResetFilters = () => {
    setFilterStatuses([]);
    setFilterProjects([]);
    setSelectedTags([]);
    setFileSearchTerm('');
  };

  return (
    <div className="w-full space-y-6">
      <h1 className="sr-only">Test Suites</h1>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Suites"
          value={suites.length}
          description="Total count of top-level test suites"
          isFirst={true}
        />
        <StatCard
          label="Total Tests"
          value={totalTestCases}
          description="Total test cases executed across all suites"
        />
      </div>

      {/* Filter & Command Bar Container */}
      {suites.length > 0 && (
        <div className="mt-6 mb-6 rounded-lg border border-border-default bg-canvas p-3 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Search Bar */}
            <SearchInput
              value={fileSearchTerm}
              onChange={setFileSearchTerm}
              placeholder="Search test suites by test title, file name, or path..."
              className="w-full sm:w-80 md:w-96 shrink-0"
            />

            {/* Right: Dropdown Filters & Reset Button */}
            <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
              <MultiSelectFilter
                label="Status"
                options={availableStatuses}
                selectedOptions={filterStatuses}
                onApply={handleStatusApply}
                getDisplayValue={() => 'Status'}
                icon={
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
                      d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h10.5"
                    />
                  </svg>
                }
              />
              <MultiSelectFilter
                label="Project"
                options={availableProjects}
                selectedOptions={filterProjects}
                onApply={handleProjectApply}
                getDisplayValue={() => 'Project'}
                icon={
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
                      d="M6.429 9.75L12 12.75l5.571-3M6.429 14.25L12 17.25l5.571-3M12 3.75L3.375 8.25 12 12.75l8.625-4.5L12 3.75z"
                    />
                  </svg>
                }
              />
              {availableTagsWithCounts.length <= 5 ? (
                <MultiSelectFilter
                  label="Tags"
                  options={tagList}
                  selectedOptions={selectedTags}
                  onApply={handleTagsApply}
                  showSearch={true}
                  align="right"
                  getDisplayValue={() => 'Tags'}
                  icon={
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
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  }
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(true)}
                  className="h-9 inline-flex items-center gap-2 rounded-md border border-border-default bg-surface-100 px-3.5 text-xs font-semibold text-text-body-mid shadow-xs transition-all duration-200 hover:border-primary-500 hover:text-text-ink dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-primary-400 dark:hover:text-text-on-primary cursor-pointer"
                >
                  <svg
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <span>Tags</span>
                  <FilterCountBadge count={selectedTags.length} />
                </button>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-9 inline-flex items-center gap-2 rounded-md border border-border-default bg-surface-100 px-3.5 text-xs font-semibold text-text-body-mid shadow-xs transition-all duration-200 hover:border-primary-500 hover:text-text-ink dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-primary-400 dark:hover:text-text-on-primary cursor-pointer"
                >
                  <svg
                    className="h-4 w-4 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suites List Header & Controls */}
      <div className="space-y-4">
        {(() => {
          const filteredSuites = filterSuites(
            suites,
            filterStatuses,
            filterProjects,
            selectedTags,
            fileSearchTerm
          );
          const isAllExpanded =
            filteredSuites.length > 0 && filteredSuites.every((s) => openSuites[s.title]);
          const isAnyExpanded = filteredSuites.some((s) => openSuites[s.title]);

          return (
            <>
              {filteredSuites.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                  <span className="text-xs font-medium text-text-body-mid dark:text-text-muted">
                    Showing{' '}
                    <strong className="text-text-ink dark:text-text-on-primary">
                      {filteredSuites.length}
                    </strong>{' '}
                    top-level suite{filteredSuites.length > 1 ? 's' : ''}
                  </span>

                  <div className="inline-flex items-center rounded-lg border border-border-default bg-surface-100 p-0.5 shadow-2xs shrink-0">
                    <button
                      type="button"
                      disabled={isAllExpanded}
                      onClick={() => {
                        const updated: Record<string, boolean> = {};
                        for (const s of filteredSuites) {
                          updated[s.title] = true;
                        }
                        setOpenSuites(updated);
                        setForceOpen(true);
                        setExpandKey((k) => k + 1);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        isAllExpanded
                          ? 'opacity-40 cursor-not-allowed text-text-body-mid'
                          : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/50 dark:hover:text-text-on-primary cursor-pointer'
                      }`}
                      title={
                        isAllExpanded
                          ? 'All suites are currently expanded'
                          : 'Expand all test suites'
                      }
                    >
                      <svg
                        className="h-3.5 w-3.5"
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
                      <span>Expand All</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isAnyExpanded}
                      onClick={() => {
                        const updated: Record<string, boolean> = {};
                        for (const s of filteredSuites) {
                          updated[s.title] = false;
                        }
                        setOpenSuites(updated);
                        setForceOpen(false);
                        setExpandKey((k) => k + 1);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        !isAnyExpanded
                          ? 'opacity-40 cursor-not-allowed text-text-body-mid'
                          : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/50 dark:hover:text-text-on-primary cursor-pointer'
                      }`}
                      title={
                        !isAnyExpanded
                          ? 'All suites are currently collapsed'
                          : 'Collapse all test suites'
                      }
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 15.75l7.5-7.5 7.5 7.5"
                        />
                      </svg>
                      <span>Collapse All</span>
                    </button>
                  </div>
                </div>
              )}
              {filteredSuites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-6 rounded-md border border-dashed border-border-default bg-surface-100/50 text-center space-y-1.5">
                  <p className="text-xs font-semibold text-text-ink dark:text-text-on-primary">
                    No suites available for current run
                  </p>
                  <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                    {suites.length === 0
                      ? 'No test cases were executed or matched the criteria.'
                      : 'No test suites match the selected filter criteria.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSuites.map((suite) => (
                    <SuiteView
                      key={suite.title}
                      suite={suite}
                      filterStatuses={filterStatuses}
                      filterProjects={filterProjects}
                      filterTags={selectedTags}
                      filterFiles={[]}
                      fileSearchTerm={fileSearchTerm}
                      isOpen={Boolean(openSuites[suite.title])}
                      onToggle={(open) => {
                        setOpenSuites((prev) => ({
                          ...prev,
                          [suite.title]: open,
                        }));
                      }}
                      forceOpen={forceOpen}
                      expandKey={expandKey}
                    />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      <TagCloudModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tagsWithCounts={availableTagsWithCounts}
        selectedTags={selectedTags}
        onApply={setSelectedTags}
      />
    </div>
  );
}
