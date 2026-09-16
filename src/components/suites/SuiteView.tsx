import { useState } from 'react';
import type { TestSuite, TestCase } from '@/lib/types';
import { formatDurationVerbose } from '@/lib/utils';
import TestCaseCard from './TestCaseCard';
import TestSuiteNode from './TestSuiteNode';

interface Props {
  suite: TestSuite;
  filterStatuses: string[];
  filterProjects: string[];
  filterTags: string[];
  filterFiles: string[];
}

type TestCaseStatus = 'passed' | 'failed' | 'skipped' | 'timedOut';

function filterCases(
  cases: TestCase[],
  filterStatuses: string[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[]
): TestCase[] {
  return cases.filter((c) => {
    const statusMatch = filterStatuses.length === 0 || filterStatuses.includes(c.status);
    const projectMatch = filterProjects.length === 0 || filterProjects.includes(c.project);
    const tagMatch =
      filterTags.length === 0 || (c.tags || []).some((tag) => filterTags.includes(tag));
    const fileMatch = filterFiles.length === 0 || filterFiles.includes(c.fileName);

    return statusMatch && projectMatch && tagMatch && fileMatch;
  });
}

function filterSuite(
  suite: TestSuite,
  filterStatuses: string[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[]
): TestSuite {
  const filteredCases = filterCases(
    suite.cases,
    filterStatuses,
    filterProjects,
    filterTags,
    filterFiles
  );
  const filteredSubSuites = (suite.subSuites || [])
    .map((sub) => filterSuite(sub, filterStatuses, filterProjects, filterTags, filterFiles))
    .filter((sub) => hasTestCases(sub, filterStatuses, filterProjects, filterTags, filterFiles));

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
  filterFiles: string[]
): boolean {
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

function countCases(
  suite: TestSuite,
  filterStatuses: string[],
  filterProjects: string[],
  filterTags: string[],
  filterFiles: string[]
): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  duration: number;
} {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let timedOut = 0;
  let interrupted = 0;
  let duration = 0;

  const cases = filterCases(suite.cases, filterStatuses, filterProjects, filterTags, filterFiles);
  total = cases.length;
  passed = cases.filter((c) => c.status === 'passed').length;
  failed = cases.filter((c) => c.status === 'failed').length;
  skipped = cases.filter((c) => c.status === 'skipped').length;
  timedOut = cases.filter((c) => c.status === 'timedOut').length;
  interrupted = cases.filter((c) => c.status === 'interrupted').length;
  duration = cases.reduce(
    (sum, c) =>
      sum +
      (c.steps && c.steps.length > 0
        ? c.steps.reduce((acc, step) => acc + (step.duration || 0), 0)
        : c.duration || 0),
    0
  );

  for (const sub of suite.subSuites || []) {
    const subCount = countCases(sub, filterStatuses, filterProjects, filterTags, filterFiles);
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

export default function SuiteView({
  suite,
  filterStatuses,
  filterProjects,
  filterTags,
  filterFiles,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredSuite =
    filterStatuses.length > 0 ||
    filterProjects.length > 0 ||
    filterTags.length > 0 ||
    filterFiles.length > 0
      ? filterSuite(suite, filterStatuses, filterProjects, filterTags, filterFiles)
      : suite;

  const { total, passed, failed, skipped, timedOut, interrupted, duration } = countCases(
    filteredSuite,
    filterStatuses,
    filterProjects,
    filterTags,
    filterFiles
  );
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;

  return (
    <details
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
      className="group rounded-md overflow-hidden bg-surface-100 shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-all duration-200"
    >
      <summary className="rounded-md group-open:rounded-b-none cursor-pointer select-none p-4 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-200/30 transition-colors">
        <div className="flex gap-3">
          <svg
            className={`h-4 w-4 mt-1 text-text-body-mid transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <h3 className="text-sm font-bold text-text-ink dark:text-text-on-primary">
              {suite.title}
            </h3>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[11px] text-text-body-mid dark:text-text-muted">
                {total} tests
              </span>
              <span className="text-text-body-mid dark:text-text-muted">·</span>
              <span className="text-[11px] font-medium text-text-body-mid dark:text-text-muted tabular-nums">
                {formatDurationVerbose(duration)}
              </span>
              <span className="text-text-body-mid dark:text-text-muted">·</span>
              <span className="text-[11px] font-medium text-success-600 dark:text-success-500">
                {passRate}% pass rate
              </span>
            </div>
          </div>
        </div>
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
          {total > 0 && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-success-50 dark:bg-success-500/20 ring-1 ring-success-500/20 px-3 py-1 text-xs font-semibold text-success-600 dark:text-success-500">
              {passed} passed
            </span>
          )}
        </div>
      </summary>

      <div className="divide-y divide-border-default dark:divide-border-default px-4 pb-4">
        {filteredSuite.cases.length > 0 && (
          <div className="py-2 space-y-2">
            {filteredSuite.cases.map((testCase, idx) => (
              <TestCaseCard key={idx} testCase={testCase} />
            ))}
          </div>
        )}

        {filteredSuite.subSuites && filteredSuite.subSuites.length > 0 && (
          <div className="pt-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
              Nested Suites
            </p>
            <div className="ml-3 border-l-2 border-[#9bb0a7] dark:border-[#3b6e62] pl-4 space-y-3">
              {filteredSuite.subSuites.map((sub, idx) => (
                <TestSuiteNode
                  key={idx}
                  suite={sub}
                  filterStatuses={filterStatuses}
                  filterProjects={filterProjects}
                  filterTags={filterTags}
                  filterFiles={filterFiles}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
