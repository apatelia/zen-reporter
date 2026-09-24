import { useState } from 'react';
import type { TestSuite, TestCase } from '@/lib/types';
import { formatDurationVerbose } from '@/lib/utils';
import { TestCaseCard } from '@/components/shared';

interface Props {
  suite: TestSuite;
  filterStatuses: string[];
  filterProjects: string[];
  filterTags: string[];
  filterFiles: string[];
  fileSearchTerm?: string;
  depth?: number;
}

function filterCases(
  cases: TestCase[],
  filterStatuses: string[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[],
  fileSearchTerm?: string
): TestCase[] {
  const query = fileSearchTerm?.trim().toLowerCase();
  return cases.filter((c) => {
    const statusMatch = filterStatuses.length === 0 || filterStatuses.includes(c.status);
    const projectMatch = filterProjects.length === 0 || filterProjects.includes(c.project);
    const tagMatch =
      filterTags.length === 0 || (c.tags || []).some((tag) => filterTags.includes(tag));
    const fileMatch = query
      ? Boolean(c.fileName && c.fileName.toLowerCase().includes(query))
      : filterFiles.length === 0 || filterFiles.includes(c.fileName);

    return statusMatch && projectMatch && tagMatch && fileMatch;
  });
}

function filterSuite(
  suite: TestSuite,
  filterStatuses: string[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[],
  fileSearchTerm?: string
): TestSuite {
  const filteredCases = filterCases(
    suite.cases,
    filterStatuses,
    filterProjects,
    filterTags,
    filterFiles,
    fileSearchTerm
  );
  const filteredSubSuites = (suite.subSuites || [])
    .map((sub) =>
      filterSuite(sub, filterStatuses, filterProjects, filterTags, filterFiles, fileSearchTerm)
    )
    .filter((sub) =>
      hasTestCases(sub, filterStatuses, filterProjects, filterTags, filterFiles, fileSearchTerm)
    );

  return {
    title: suite.title,
    cases: filteredCases,
    subSuites: filteredSubSuites.length > 0 ? filteredSubSuites : undefined,
  };
}

function hasTestCases(
  suite: TestSuite,
  filterStatuses: string[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[],
  fileSearchTerm?: string
): boolean {
  const query = fileSearchTerm?.trim().toLowerCase();
  const hasMatchingCases = suite.cases.some((c) => {
    const statusMatch = filterStatuses.length === 0 || filterStatuses.includes(c.status);
    const projectMatch = filterProjects.length === 0 || filterProjects.includes(c.project);
    const tagMatch =
      filterTags.length === 0 || (c.tags || []).some((tag) => filterTags.includes(tag));
    const fileMatch = query
      ? Boolean(c.fileName && c.fileName.toLowerCase().includes(query))
      : filterFiles.length === 0 || filterFiles.includes(c.fileName);

    return statusMatch && projectMatch && tagMatch && fileMatch;
  });

  if (hasMatchingCases) return true;

  for (const sub of suite.subSuites || []) {
    if (hasTestCases(sub, filterStatuses, filterProjects, filterTags, filterFiles, fileSearchTerm))
      return true;
  }

  return false;
}

function countCases(
  suite: TestSuite,
  filterStatuses: string[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[],
  fileSearchTerm?: string
): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  duration: number;
} {
  const cases = filterCases(
    suite.cases,
    filterStatuses,
    filterProjects,
    filterTags,
    filterFiles,
    fileSearchTerm
  );
  let total = cases.length;
  let passed = cases.filter((c) => c.status === 'passed').length;
  let failed = cases.filter((c) => c.status === 'failed').length;
  let skipped = cases.filter((c) => c.status === 'skipped').length;
  let timedOut = cases.filter((c) => c.status === 'timedOut').length;
  let interrupted = cases.filter((c) => c.status === 'interrupted').length;
  let duration = cases.reduce(
    (sum, c) =>
      sum +
      (c.steps && c.steps.length > 0
        ? c.steps.reduce((acc, step) => acc + (step.duration || 0), 0)
        : c.duration || 0),
    0
  );

  for (const sub of suite.subSuites || []) {
    const subCount = countCases(
      sub,
      filterStatuses,
      filterProjects,
      filterTags,
      filterFiles,
      fileSearchTerm
    );
    total += subCount.total;
    passed += subCount.passed;
    failed += subCount.failed;
    skipped += subCount.skipped;
    timedOut += subCount.timedOut;
    interrupted += subCount.interrupted;
    duration += subCount.duration;
  }

  return { total, passed, failed, skipped, timedOut, interrupted, duration };
}

export default function TestSuiteNode({
  suite,
  filterStatuses,
  filterProjects,
  filterTags,
  filterFiles,
  fileSearchTerm,
  depth = 1,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredSuite =
    filterStatuses.length > 0 ||
    filterProjects.length > 0 ||
    filterTags.length > 0 ||
    filterFiles.length > 0 ||
    Boolean(fileSearchTerm?.trim())
      ? filterSuite(suite, filterStatuses, filterProjects, filterTags, filterFiles, fileSearchTerm)
      : suite;

  const { total, passed, failed, skipped, timedOut, interrupted, duration } = countCases(
    filteredSuite,
    filterStatuses,
    filterProjects,
    filterTags,
    filterFiles,
    fileSearchTerm
  );
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;

  const bgClass =
    depth % 2 === 1 ? 'bg-canvas dark:bg-canvas/80' : 'bg-surface-100 dark:bg-surface-100';

  return (
    <details
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
      className={`group rounded-md overflow-hidden ${bgClass} shadow-xs border border-border-default dark:border-border-default transition-all`}
    >
      <summary className="rounded-md group-open:rounded-b-none cursor-pointer select-none p-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-0 hover:bg-surface-100/50 dark:hover:bg-surface-200/40 transition-colors">
        <div className="flex items-center gap-2">
          <svg
            className={`h-3.5 w-3.5 text-text-body-mid transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-text-ink dark:text-text-on-primary">
            {suite.title}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 items-end sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs text-text-body-mid dark:text-text-muted tabular-nums">
            {total} tests · {formatDurationVerbose(duration)} · {passRate}%
          </span>
          <div className="flex items-center gap-1.5">
            {skipped > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600 px-2.5 py-1 text-xs font-semibold">
                {skipped} skipped
              </span>
            )}
            {interrupted > 0 && (
              <span className="inline-flex items-center rounded-full bg-danger-50 dark:bg-danger-500/20 ring-1 ring-danger-500/20 px-2.5 py-1 text-xs font-semibold text-danger-600 dark:text-danger-500">
                {interrupted} interrupted
              </span>
            )}
            {timedOut > 0 && (
              <span className="inline-flex items-center rounded-full bg-warning-50 dark:bg-warning-500/20 ring-1 ring-warning-500/20 px-2.5 py-1 text-xs font-semibold text-warning-600 dark:text-warning-500">
                {timedOut} timed out
              </span>
            )}
            {failed > 0 && (
              <span className="inline-flex items-center rounded-full bg-danger-50 dark:bg-danger-500/20 ring-1 ring-danger-500/20 px-3 py-1 text-xs font-semibold text-danger-600 dark:text-danger-500">
                {failed} failed
              </span>
            )}
          </div>
        </div>
      </summary>

      <div className="divide-y divide-border-default dark:divide-border-default px-3 pb-3">
        <div className="py-2 space-y-2">
          {filteredSuite.cases.map((testCase) => (
            <TestCaseCard
              key={`${testCase.project}-${testCase.fileName}-${testCase.title}`}
              testCase={testCase}
            />
          ))}
        </div>
        {filteredSuite.subSuites && filteredSuite.subSuites.length > 0 && (
          <div className="pt-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
              Sub-Suites
            </p>
            <div className="ml-3 border-l-2 border-border-default dark:border-border-default pl-3 space-y-2">
              {filteredSuite.subSuites.map((sub) => (
                <TestSuiteNode
                  key={sub.title}
                  suite={sub}
                  filterStatuses={filterStatuses}
                  filterProjects={filterProjects}
                  filterTags={filterTags}
                  filterFiles={filterFiles}
                  fileSearchTerm={fileSearchTerm}
                  depth={depth + 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
