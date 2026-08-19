import { useState, useMemo } from 'react';
import type { TestSuite } from '@/lib/types';
import { extractFailedTests } from '@/lib/utils';
import MultiSelectFilter from '../suites/MultiSelectFilter';
import FailureList from './FailureList';

type FailureType = 'Failed' | 'Timed Out';

interface Props {
  suites: TestSuite[];
  failedCount: number;
  timedOutCount: number;
}

function getAllFailureTypes(suites: TestSuite[]): FailureType[] {
  const types = new Set<FailureType>();
  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      if (c.status === 'failed' || c.status === 'timedOut') {
        types.add(c.status === 'timedOut' ? 'Timed Out' : 'Failed');
      }
    }
    for (const sub of suite.subSuites || []) {
      collect(sub);
    }
  }
  for (const suite of suites) {
    collect(suite);
  }
  return ['Failed', 'Timed Out'].filter((t: string): t is FailureType =>
    types.has(t as FailureType)
  );
}

function getAllFailureTags(suites: TestSuite[]): string[] {
  const tagSet = new Set<string>();
  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      if (c.status === 'failed' || c.status === 'timedOut') {
        for (const tag of c.tags || []) {
          tagSet.add(tag.replace('@', ''));
        }
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

function getAllFailureProjects(suites: TestSuite[]): string[] {
  const projectSet = new Set<string>();
  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      if (c.status === 'failed' || c.status === 'timedOut') {
        if (c.project) {
          projectSet.add(c.project);
        }
      }
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

function getAllFailureFiles(suites: TestSuite[]): string[] {
  const fileSet = new Set<string>();
  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      if (c.status === 'failed' || c.status === 'timedOut') {
        fileSet.add(c.fileName);
      }
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

export default function FailuresSection({ suites, failedCount, timedOutCount }: Props) {
  const [filterTypes, setFilterTypes] = useState<FailureType[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterFiles, setFilterFiles] = useState<string[]>([]);

  const availableTypes = useMemo(() => getAllFailureTypes(suites), [suites]);
  const availableProjects = useMemo(() => getAllFailureProjects(suites), [suites]);
  const availableTags = useMemo(() => getAllFailureTags(suites), [suites]);
  const availableFiles = useMemo(() => getAllFailureFiles(suites), [suites]);

  const filteredFailedTests = useMemo(() => {
    const all = extractFailedTests(suites);
    if (
      filterTypes.length === 0 &&
      filterProjects.length === 0 &&
      filterTags.length === 0 &&
      filterFiles.length === 0
    ) {
      return all;
    }
    return all.filter((t) => {
      const typeMatch = filterTypes.length === 0 || filterTypes.includes(t.type as FailureType);
      const projectMatch =
        filterProjects.length === 0 || filterProjects.includes(t.testCase?.project || '');
      const tagMatch =
        filterTags.length === 0 || (t.tags || []).some((tag) => filterTags.includes(tag));
      const fileMatch = filterFiles.length === 0 || filterFiles.includes(t.fileName);
      return typeMatch && projectMatch && tagMatch && fileMatch;
    });
  }, [suites, filterTypes, filterProjects, filterTags, filterFiles]);

  const hasActiveFilters =
    filterTypes.length > 0 ||
    filterProjects.length > 0 ||
    filterTags.length > 0 ||
    filterFiles.length > 0;

  const handleResetFilters = () => {
    setFilterTypes([]);
    setFilterProjects([]);
    setFilterTags([]);
    setFilterFiles([]);
  };

  return (
    <>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
        Failed Tests
      </h2>
      <div className="mb-4 w-fit grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-surface-50 border border-border-default px-4 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Failed
          </p>
          <p className="mt-1 text-xl font-extrabold text-danger-600 dark:text-danger-500">
            {failedCount}
          </p>
        </div>
        <div className="rounded-md bg-surface-50 border border-border-default px-4 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Timed Out
          </p>
          <p className="mt-1 text-xl font-extrabold text-warning-600 dark:text-warning-500">
            {timedOutCount}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mt-6 mb-6">
        <div className="flex flex-col md:flex-row items-start gap-2">
          <MultiSelectFilter
            label="Type"
            options={availableTypes}
            selectedOptions={filterTypes}
            onApply={setFilterTypes}
            getDisplayValue={() => 'Type'}
            icon={
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
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <MultiSelectFilter
            label="Projects"
            options={availableProjects}
            selectedOptions={filterProjects}
            onApply={setFilterProjects}
            showSearch={true}
            getDisplayValue={() => 'Projects'}
            icon={
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
                  d="M2.25 12.75l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12.75M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125h4.375A1.125 1.125 0 0011.125 19.875v-4.125c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125v4.125c0 .621.504 1.125 1.125 1.125h4.375c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            }
          />
          <MultiSelectFilter
            label="Tags"
            options={availableTags}
            selectedOptions={filterTags}
            onApply={setFilterTags}
            showSearch={true}
            getDisplayValue={() => 'Tags'}
            icon={
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
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            }
          />
          <MultiSelectFilter
            label="Files"
            options={availableFiles}
            selectedOptions={filterFiles}
            onApply={setFilterFiles}
            showSearch={true}
            getDisplayValue={() => 'Files'}
            icon={
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-100 px-3 py-1.5 text-xs font-medium text-text-body-mid transition-all duration-200 hover:border-border-default hover:text-text-ink dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-border-default dark:hover:text-text-on-primary"
            >
              <svg
                className="h-3.5 w-3.5 text-text-muted"
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

      <FailureList failedTests={filteredFailedTests} />
    </>
  );
}
