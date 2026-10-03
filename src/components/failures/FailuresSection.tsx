import { useState, useMemo } from 'react';
import type { TestSuite } from '@/lib/types/report';
import { extractFailedTests } from '@/lib/statsUtils';
import MultiSelectFilter from '@/components/shared/MultiSelectFilter';
import StatCard from '@/components/shared/StatCard';
import SearchInput from '@/components/shared/SearchInput';
import TagCloudModal from '@/components/shared/TagCloudModal';
import type { TagCloudOption } from '@/components/shared/TagCloudModal';
import FailureList from './FailureList';

type FailureType = 'Failed' | 'Timed Out' | 'Interrupted';

export interface FailuresSectionProps {
  suites: TestSuite[];
  failedCount: number;
  timedOutCount: number;
  interruptedCount?: number;
}

function getAllFailureTypes(suites: TestSuite[]): FailureType[] {
  const types = new Set<FailureType>();
  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      if (c.status === 'failed' || c.status === 'timedOut' || c.status === 'interrupted') {
        types.add(
          c.status === 'timedOut'
            ? 'Timed Out'
            : c.status === 'interrupted'
              ? 'Interrupted'
              : 'Failed'
        );
      }
    }
    for (const sub of suite.subSuites || []) {
      collect(sub);
    }
  }
  for (const suite of suites) {
    collect(suite);
  }
  return ['Failed', 'Timed Out', 'Interrupted'].filter((t: string): t is FailureType =>
    types.has(t as FailureType)
  );
}

function getAllFailureTagsWithCounts(suites: TestSuite[]): TagCloudOption[] {
  const countsMap = new Map<string, number>();
  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      if (c.status === 'failed' || c.status === 'timedOut' || c.status === 'interrupted') {
        for (const tag of c.tags || []) {
          const clean = tag.replace(/^@/, '');
          countsMap.set(clean, (countsMap.get(clean) || 0) + 1);
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
  return Array.from(countsMap.entries()).map(([tag, count]) => ({ tag, count }));
}

function getAllFailureProjects(suites: TestSuite[]): string[] {
  const projectSet = new Set<string>();
  function collect(suite: TestSuite) {
    for (const c of suite.cases) {
      if (c.status === 'failed' || c.status === 'timedOut' || c.status === 'interrupted') {
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

export default function FailuresSection({
  suites,
  failedCount,
  timedOutCount,
  interruptedCount = 0,
}: FailuresSectionProps) {
  const [filterTypes, setFilterTypes] = useState<FailureType[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [fileSearchTerm, setFileSearchTerm] = useState<string>('');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  const availableTypes = useMemo(() => getAllFailureTypes(suites), [suites]);
  const availableProjects = useMemo(() => getAllFailureProjects(suites), [suites]);
  const availableTagsWithCounts = useMemo(() => getAllFailureTagsWithCounts(suites), [suites]);
  const tagList = useMemo(
    () => availableTagsWithCounts.map((t) => t.tag),
    [availableTagsWithCounts]
  );

  const filteredFailedTests = useMemo(() => {
    const all = extractFailedTests(suites);
    if (
      filterTypes.length === 0 &&
      filterProjects.length === 0 &&
      filterTags.length === 0 &&
      !fileSearchTerm.trim()
    ) {
      return all;
    }
    const query = fileSearchTerm.trim().toLowerCase();
    return all.filter((t) => {
      const typeMatch = filterTypes.length === 0 || filterTypes.includes(t.type as FailureType);
      const projectMatch =
        filterProjects.length === 0 || filterProjects.includes(t.testCase?.project || '');
      const tagMatch =
        filterTags.length === 0 || (t.tags || []).some((tag) => filterTags.includes(tag));
      const fileMatch = !query || (t.fileName && t.fileName.toLowerCase().includes(query));
      return typeMatch && projectMatch && tagMatch && fileMatch;
    });
  }, [suites, filterTypes, filterProjects, filterTags, fileSearchTerm]);

  const hasActiveFilters =
    filterTypes.length > 0 ||
    filterProjects.length > 0 ||
    filterTags.length > 0 ||
    fileSearchTerm.trim().length > 0;

  const noFailures = failedCount + timedOutCount + interruptedCount === 0;

  const handleResetFilters = () => {
    setFilterTypes([]);
    setFilterProjects([]);
    setFilterTags([]);
    setFileSearchTerm('');
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
          Failures
        </h2>
        <p className="mt-1 text-sm text-text-body-mid dark:text-text-muted">
          Detailed error tracebacks, screenshot evidence, and root-cause analysis for failed tests.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Failed"
          value={failedCount}
          subtext={failedCount === 1 ? '1 test failed' : `${failedCount} tests failed`}
          description="Test cases that encountered assertion or runtime execution errors"
          badgeClass={
            failedCount > 0
              ? 'bg-danger-500/10 text-danger-600 dark:bg-danger-500/20 dark:text-danger-500'
              : 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-500'
          }
          isFirst={true}
        />
        <StatCard
          label="Timed Out"
          value={timedOutCount}
          subtext={timedOutCount === 1 ? '1 test timed out' : `${timedOutCount} tests timed out`}
          description="Test cases that exceeded their maximum allotted timeout threshold"
          badgeClass={
            timedOutCount > 0
              ? 'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-500'
              : 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-500'
          }
        />
        {interruptedCount > 0 && (
          <StatCard
            label="Interrupted"
            value={interruptedCount}
            subtext={`${interruptedCount} interrupted`}
            description="Test cases interrupted by worker crashes or process termination"
            badgeClass="bg-danger-500/10 text-danger-600 dark:bg-danger-500/20 dark:text-danger-500"
          />
        )}
      </div>

      {/* Filter Controls */}
      {!noFailures && (
        <div>
          <div className="flex flex-wrap items-center gap-3.5">
            <MultiSelectFilter
              label="Type"
              options={availableTypes}
              selectedOptions={filterTypes}
              onApply={setFilterTypes}
              getDisplayValue={() => 'Type'}
              disabled={noFailures}
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
              disabled={noFailures}
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
                selectedOptions={filterTags}
                onApply={setFilterTags}
                showSearch={true}
                getDisplayValue={() => 'Tags'}
                disabled={noFailures}
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
                disabled={noFailures}
                onClick={() => setIsTagModalOpen(true)}
                className={`inline-flex items-center gap-2.5 rounded-lg border border-border-default bg-surface-100 px-4 py-2 text-sm font-semibold text-text-body-mid shadow-xs transition-all duration-200 ${
                  noFailures
                    ? 'opacity-50 cursor-not-allowed pointer-events-none'
                    : 'hover:border-primary-500 hover:text-text-ink dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-primary-400 dark:hover:text-text-on-primary cursor-pointer'
                }`}
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
                <span>{filterTags.length > 0 ? `Tags (${filterTags.length})` : 'Tags'}</span>
                {filterTags.length > 0 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue text-xs font-bold text-text-on-primary shadow-xs">
                    {filterTags.length}
                  </span>
                )}
              </button>
            )}
            <SearchInput
              value={fileSearchTerm}
              onChange={setFileSearchTerm}
              disabled={noFailures}
              placeholder="Filter by file name..."
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

      <FailureList failedTests={filteredFailedTests} hasSuites={suites.length > 0} />

      <TagCloudModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tagsWithCounts={availableTagsWithCounts}
        selectedTags={filterTags}
        onApply={setFilterTags}
      />
    </div>
  );
}
