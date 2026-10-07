import { useState, useMemo } from 'react';
import type { FailedTest } from '@/lib/statsUtils';
import { getErrorSignature } from '@/lib/cryptoUtils';
import TestCaseCard from '@/components/shared/TestCaseCard';

export interface FailureListProps {
  failedTests: FailedTest[];
  hasSuites?: boolean;
  totalFailuresCount?: number;
  onResetFilters?: () => void;
}

type GroupByMode = 'file' | 'signature';

interface ErrorClusterGroup {
  hash: string;
  shortHash: string;
  representativeMessage: string;
  tests: FailedTest[];
  filesCount: number;
  projectsCount: number;
}

export default function FailureList({
  failedTests,
  hasSuites = true,
  totalFailuresCount,
  onResetFilters,
}: FailureListProps) {
  const [groupBy, setGroupBy] = useState<GroupByMode>('file');

  // Group failed tests by fileName
  const groupedByFile = useMemo(() => {
    const groups: { [fileName: string]: FailedTest[] } = {};
    for (const test of failedTests) {
      const file = test.fileName || 'Unknown file';
      if (!groups[file]) {
        groups[file] = [];
      }
      groups[file].push(test);
    }
    return groups;
  }, [failedTests]);

  const fileNames = useMemo(() => Object.keys(groupedByFile).sort(), [groupedByFile]);

  // Group failed tests by Error Signature (SHA-256 cluster)
  const groupedBySignature = useMemo(() => {
    const clusters: Record<string, ErrorClusterGroup> = {};

    for (const test of failedTests) {
      const { hash, shortHash, representativeMessage } = getErrorSignature(test);

      if (!clusters[hash]) {
        clusters[hash] = {
          hash,
          shortHash,
          representativeMessage,
          tests: [],
          filesCount: 0,
          projectsCount: 0,
        };
      }
      clusters[hash].tests.push(test);
    }

    const clusterList = Object.values(clusters);
    for (const c of clusterList) {
      const files = new Set(c.tests.map((t) => t.fileName));
      const projects = new Set(c.tests.map((t) => t.testCase.project).filter(Boolean));
      c.filesCount = files.size;
      c.projectsCount = projects.size;
    }

    // Sort clusters by highest impact (most failed tests) first
    return clusterList.sort((a, b) => b.tests.length - a.tests.length);
  }, [failedTests]);

  // Track expanded state for sections
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const currentGroupKeys = useMemo(() => {
    return groupBy === 'file' ? fileNames : groupedBySignature.map((c) => c.hash);
  }, [groupBy, fileNames, groupedBySignature]);

  const isAllExpanded = useMemo(() => {
    return currentGroupKeys.length > 0 && currentGroupKeys.every((k) => expandedKeys[k]);
  }, [currentGroupKeys, expandedKeys]);

  if (failedTests.length === 0) {
    if (totalFailuresCount !== undefined && totalFailuresCount > 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 rounded-md border border-border-default bg-surface-50/50 text-center dark:border-border-default dark:bg-surface-50/20">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-200 border border-border-default">
            <svg
              className="h-6 w-6 text-text-body-mid dark:text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-ink dark:text-text-on-primary">
            No matching failures found
          </p>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted max-w-md">
            No failure items match your search query or selected filter criteria. Try clearing or
            adjusting your filters.
          </p>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 h-8 inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-100 px-3 text-xs font-semibold text-text-body-mid shadow-2xs hover:border-primary-500 hover:text-text-ink dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-primary-400 dark:hover:text-text-on-primary cursor-pointer transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>
      );
    }

    if (!hasSuites) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-6 rounded-md border border-dashed border-border-default bg-surface-100/50 text-center space-y-1.5">
          <p className="text-xs font-semibold text-text-ink dark:text-text-on-primary">
            No failures found
          </p>
          <p className="text-[11px] text-text-body-mid dark:text-text-muted">
            No test cases were executed or matched the criteria.
          </p>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4 rounded-md border border-success-200 bg-success-50/50 px-6 py-6 shadow-sm dark:border-success-500/30 dark:bg-success-500/10">
        <svg
          className="h-8 w-8 text-success-500 dark:text-success-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-left">
          <p className="text-sm font-semibold text-success-600 dark:text-success-400">
            No failures
          </p>
          <p className="text-xs text-text-body-mid dark:text-text-muted">
            All tests passed successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group By Mode Toggle & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted">
              Group by:
            </span>
            <div className="inline-flex items-center rounded-md border border-border-default bg-surface-100 p-0.5 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setGroupBy('file');
                  setExpandedKeys({});
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                  groupBy === 'file'
                    ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                    : 'border border-transparent text-text-body-mid hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary font-medium'
                }`}
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                File
              </button>
              <button
                type="button"
                onClick={() => {
                  setGroupBy('signature');
                  setExpandedKeys({});
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                  groupBy === 'signature'
                    ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                    : 'border border-transparent text-text-body-mid hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary font-medium'
                }`}
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
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
                Error
              </button>
            </div>
          </div>

          <span className="text-xs font-medium text-text-body-mid dark:text-text-muted border-l border-border-default pl-3 dark:border-border-subtle">
            {groupBy === 'file' ? (
              <>
                Grouped into{' '}
                <strong className="text-text-ink dark:text-text-on-primary">
                  {fileNames.length}
                </strong>{' '}
                file{fileNames.length > 1 ? 's' : ''} ({failedTests.length} failure
                {failedTests.length > 1 ? 's' : ''})
              </>
            ) : (
              <>
                Clustered into{' '}
                <strong className="text-text-ink dark:text-text-on-primary">
                  {groupedBySignature.length}
                </strong>{' '}
                error{groupedBySignature.length > 1 ? 's' : ''} ({failedTests.length} failure
                {failedTests.length > 1 ? 's' : ''})
              </>
            )}
          </span>
        </div>

        {currentGroupKeys.length > 0 && (
          <div className="inline-flex items-center rounded-lg border border-border-default bg-surface-100 p-0.5 shadow-2xs shrink-0">
            <button
              type="button"
              disabled={isAllExpanded}
              onClick={() => {
                const updated: Record<string, boolean> = {};
                for (const k of currentGroupKeys) {
                  updated[k] = true;
                }
                setExpandedKeys(updated);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                isAllExpanded
                  ? 'opacity-40 cursor-not-allowed text-text-body-mid'
                  : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/50 dark:hover:text-text-on-primary cursor-pointer'
              }`}
              title={isAllExpanded ? 'All failures are currently expanded' : 'Expand all failures'}
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
              disabled={
                currentGroupKeys.every((k) => expandedKeys[k] === false) ||
                Object.keys(expandedKeys).length === 0
              }
              onClick={() => {
                const updated: Record<string, boolean> = {};
                for (const k of currentGroupKeys) {
                  updated[k] = false;
                }
                setExpandedKeys(updated);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                currentGroupKeys.every((k) => expandedKeys[k] === false) ||
                Object.keys(expandedKeys).length === 0
                  ? 'opacity-40 cursor-not-allowed text-text-body-mid'
                  : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/50 dark:hover:text-text-on-primary cursor-pointer'
              }`}
              title={
                currentGroupKeys.every((k) => expandedKeys[k] === false) ||
                Object.keys(expandedKeys).length === 0
                  ? 'All failures are currently collapsed'
                  : 'Collapse all failures'
              }
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              <span>Collapse All</span>
            </button>
          </div>
        )}
      </div>

      {/* Group by File Render */}
      {groupBy === 'file' &&
        fileNames.map((fileName) => {
          const tests = groupedByFile[fileName];
          const isExpanded = Boolean(expandedKeys[fileName]);

          return (
            <div
              key={fileName}
              className="rounded-md overflow-hidden bg-surface-100 shadow-sm transition-all"
            >
              <button
                type="button"
                onClick={() => toggleExpanded(fileName)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-50 dark:hover:bg-surface-200/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 text-text-body-mid transition-transform duration-200 ${
                      !isExpanded ? '-rotate-90' : ''
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
                  <svg
                    className="h-4 w-4 shrink-0 text-primary-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <span className="truncate font-mono text-xs font-bold text-text-ink dark:text-text-on-primary">
                    {fileName}
                  </span>
                </div>
                <span className="shrink-0 ml-3 rounded-full bg-danger-50 dark:bg-danger-500/20 ring-1 ring-danger-500/20 px-3 py-1 text-xs font-semibold text-danger-600 dark:text-danger-500">
                  {tests.length} failed
                </span>
              </button>

              {isExpanded && (
                <div className="p-3 space-y-2 border-t border-border-default bg-surface-50/50 dark:bg-surface-200/20">
                  {tests.map((test) => (
                    <TestCaseCard
                      key={`${test.testCase.project}-${test.testCase.fileName}-${test.testCase.title}`}
                      testCase={test.testCase}
                      showSteps={false}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {/* Group by Error Signature Render */}
      {groupBy === 'signature' &&
        groupedBySignature.map((cluster) => {
          const isExpanded = Boolean(expandedKeys[cluster.hash]);

          return (
            <div
              key={cluster.hash}
              className="rounded-md overflow-hidden bg-surface-100 shadow-sm border border-border-default transition-all"
            >
              {/* Cluster Header */}
              <button
                type="button"
                onClick={() => toggleExpanded(cluster.hash)}
                className="w-full flex items-start justify-between p-3.5 text-left hover:bg-surface-50 dark:hover:bg-surface-200/30 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 pr-4">
                  <svg
                    className={`h-4 w-4 mt-0.5 shrink-0 text-text-body-mid transition-transform duration-200 ${
                      !isExpanded ? '-rotate-90' : ''
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
                  <div className="space-y-1.5 min-w-0">
                    {/* 1st Line: Error Message Text */}
                    <p className="font-mono text-xs font-bold text-danger-600 dark:text-danger-400 line-clamp-2 break-all">
                      {cluster.representativeMessage}
                    </p>

                    {/* 2nd Line: Systemic Cause Badge & Impact Metrics */}
                    <div className="flex flex-wrap items-center gap-2">
                      {cluster.tests.length > 1 && (
                        <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-1 dark:ring-amber-500/40">
                          Shared Issue ({cluster.tests.length} tests)
                        </span>
                      )}
                      <span className="text-xs font-medium text-text-body-mid dark:text-text-muted">
                        Impacts {cluster.filesCount} file{cluster.filesCount > 1 ? 's' : ''}
                        {cluster.projectsCount > 0
                          ? `, ${cluster.projectsCount} project${cluster.projectsCount > 1 ? 's' : ''}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-danger-50 dark:bg-danger-500/20 ring-1 ring-danger-500/20 px-3 py-1 text-xs font-semibold text-danger-600 dark:text-danger-500">
                  {cluster.tests.length} failed
                </span>
              </button>

              {/* Cluster Body */}
              {isExpanded && (
                <div className="p-3.5 space-y-2.5 border-t border-border-default bg-surface-50/50 dark:bg-surface-200/20">
                  <div className="mb-2 text-xs font-semibold text-text-body-mid dark:text-text-muted">
                    Affected Test Cases ({cluster.tests.length}):
                  </div>
                  {cluster.tests.map((test) => (
                    <TestCaseCard
                      key={`cluster-${cluster.shortHash}-${test.testCase.project}-${test.testCase.fileName}-${test.testCase.title}`}
                      testCase={test.testCase}
                      showSteps={false}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
