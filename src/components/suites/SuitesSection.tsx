import type { TestSuite } from '@/lib/types';
import { useMemo, useState } from 'react';
import MultiSelectFilter from './MultiSelectFilter';
import SuiteView from './SuiteView';

type TestCaseStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';

interface Props {
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

function getAllTags(suites: TestSuite[]): string[] {
  const tagSet = new Set<string>();

  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      for (const tag of c.tags || []) {
        tagSet.add(tag);
      }
    }
    for (const sub of suite.subSuites || []) {
      collect(sub);
    }
  }

  for (const suite of suites) {
    collect(suite);
  }

  return Array.from(tagSet).sort();
}

function getAllFiles(suites: TestSuite[]): string[] {
  const fileSet = new Set<string>();

  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      fileSet.add(c.fileName);
    }
    for (const sub of suite.subSuites || []) {
      collect(sub);
    }
  }

  for (const suite of suites) {
    collect(suite);
  }

  return Array.from(fileSet).sort();
}

function hasTestCases(
  suite: TestSuite,
  filterStatuses: TestCaseStatus[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[]
): boolean {
  if (
    filterStatuses.length === 0 &&
    filterProjects.length === 0 &&
    filterTags.length === 0 &&
    filterFiles.length === 0
  )
    return true;

  const hasMatchingCases = suite.cases.some((c) => {
    const statusMatch = filterStatuses.length === 0 || filterStatuses.includes(c.status);
    const projectMatch = filterProjects.length === 0 || filterProjects.includes(c.project);
    const tagMatch =
      filterTags.length === 0 || (c.tags || []).some((tag) => filterTags.includes(tag));
    const fileMatch = filterFiles.length === 0 || filterFiles.includes(c.fileName);

    return statusMatch && projectMatch && tagMatch && fileMatch;
  });

  if (hasMatchingCases) return true;

  for (const sub of suite.subSuites || []) {
    if (hasTestCases(sub, filterStatuses, filterProjects, filterTags, filterFiles)) return true;
  }

  return false;
}

function filterSuites(
  suites: TestSuite[],
  filterStatuses: TestCaseStatus[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[]
): TestSuite[] {
  if (
    filterStatuses.length === 0 &&
    filterProjects.length === 0 &&
    filterTags.length === 0 &&
    filterFiles.length === 0
  )
    return suites;
  return suites.filter((suite) =>
    hasTestCases(suite, filterStatuses, filterProjects, filterTags, filterFiles)
  );
}

export default function SuitesSection({ suites }: Props) {
  const [filterStatuses, setFilterStatuses] = useState<TestCaseStatus[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const availableStatuses = useMemo(() => getAllStatuses(suites), [suites]);
  const availableProjects = useMemo(() => getAllProjects(suites), [suites]);
  const totalTestCases = useMemo(() => countTotalCases(suites), [suites]);
  const availableTags = useMemo(() => getAllTags(suites), [suites]);
  const availableFiles = useMemo(() => getAllFiles(suites), [suites]);

  const handleStatusApply = (statuses: TestCaseStatus[]) => {
    setFilterStatuses(statuses);
  };

  const handleProjectApply = (projects: string[]) => {
    setFilterProjects(projects);
  };

  const handleTagsApply = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const handleFilesApply = (files: string[]) => {
    setSelectedFiles(files);
  };

  const hasActiveFilters =
    filterStatuses.length > 0 ||
    filterProjects.length > 0 ||
    selectedTags.length > 0 ||
    selectedFiles.length > 0;

  const handleResetFilters = () => {
    setFilterStatuses([]);
    setFilterProjects([]);
    setSelectedTags([]);
    setSelectedFiles([]);
  };

  return (
    <>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
        Test Suites
      </h2>

      {/* Quick Stat Card */}
      <div className="mb-3 w-fit grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-surface-50 border border-border-default px-4 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Suites
          </p>
          <p className="mt-1 text-xl font-extrabold text-text-ink dark:text-text-on-primary">
            {suites.length}
          </p>
        </div>
        <div className="rounded-md bg-surface-50 border border-border-default px-4 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Total Tests
          </p>
          <p className="mt-1 text-xl font-extrabold text-text-ink dark:text-text-on-primary">
            {totalTestCases}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      {suites.length > 0 && (
        <div className="mt-6 mb-6">
          <div className="flex flex-wrap items-center gap-3.5">
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
            <MultiSelectFilter
              label="Tags"
              options={availableTags}
              selectedOptions={selectedTags}
              onApply={handleTagsApply}
              showSearch={true}
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
            <MultiSelectFilter
              label="Files"
              options={availableFiles}
              selectedOptions={selectedFiles}
              onApply={handleFilesApply}
              showSearch={true}
              getDisplayValue={() => 'Files'}
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface-100 px-4 py-2 text-sm font-semibold text-text-body-mid shadow-xs transition-all duration-200 hover:border-danger-500 hover:text-danger-600 dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-danger-400 dark:hover:text-danger-400"
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
      )}

      {/* Suites List */}
      <div className="space-y-4">
        {(() => {
          const filteredSuites = filterSuites(
            suites,
            filterStatuses,
            filterProjects,
            selectedTags,
            selectedFiles
          );
          if (filteredSuites.length === 0) {
            return (
              <div className="flex items-center gap-4 rounded-md border border-slate-300/80 bg-slate-100/70 px-6 py-6 shadow-xs dark:border-slate-700/60 dark:bg-slate-800/40">
                <svg
                  className="h-8 w-8 text-slate-500 dark:text-slate-400 shrink-0"
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
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No suites
                  </p>
                  <p className="text-xs text-text-body-mid dark:text-text-muted">
                    {suites.length === 0
                      ? 'No suites/tests found.'
                      : 'No test suites match the selected filter criteria.'}
                  </p>
                </div>
              </div>
            );
          }
          return filteredSuites.map((suite, idx) => (
            <SuiteView
              key={idx}
              suite={suite}
              filterStatuses={filterStatuses}
              filterProjects={filterProjects}
              filterTags={selectedTags}
              filterFiles={selectedFiles}
            />
          ));
        })()}
      </div>
    </>
  );
}
