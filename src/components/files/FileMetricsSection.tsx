import { useMemo } from 'react';
import type { TestSuite } from '@/lib/types';
import { StatCard } from '@/components/shared';

import {
  collectAllCases,
  computeFileStats,
  formatDuration,
  truncateMiddlePath,
  FileStats,
} from '@/lib/utils';

interface Props {
  suites: TestSuite[];
  isMinimalReport?: boolean;
}

export default function FileMetricsSection({ suites, isMinimalReport }: Props) {
  const allCases = useMemo(() => collectAllCases(suites), [suites]);
  const fileStats = useMemo(() => computeFileStats(allCases), [allCases]);

  if (fileStats.length === 0) return null;

  const totalFiles = fileStats.length;
  const totalTests = allCases.length;

  const cleanFiles = fileStats.filter(
    (f) =>
      f.passed === f.total &&
      f.total > 0 &&
      f.failed === 0 &&
      f.timedOut === 0 &&
      f.interrupted === 0
  );
  const cleanFilesCount = cleanFiles.length;
  const cleanFilesPct = Math.round((cleanFilesCount / totalFiles) * 100);

  const failingFiles = fileStats.filter((f) => f.failed > 0 || f.timedOut > 0 || f.interrupted > 0);
  const failingFilesCount = failingFiles.length;
  const failingFilesPct = Math.round((failingFilesCount / totalFiles) * 100);

  // Sorted by total duration for bottlenecks
  const sortedByDuration = [...fileStats].sort((a, b) => b.totalDuration - a.totalDuration);
  const slowestFile = sortedByDuration[0];

  // Total execution time across all files
  const totalExecutionTime = fileStats.reduce((acc, f) => acc + f.totalDuration, 0);
  const avgFileDuration = totalFiles > 0 ? Math.round(totalExecutionTime / totalFiles) : 0;
  const avgTestsPerFile = totalFiles > 0 ? (totalTests / totalFiles).toFixed(1) : '0';

  // Highest Test Density File
  const sortedByTestCount = [...fileStats].sort((a, b) => b.total - a.total);
  const highestDensityFile = sortedByTestCount[0];

  // Failure Concentration (Hotspot)
  const totalFailures = fileStats.reduce(
    (acc, f) => acc + f.failed + f.timedOut + f.interrupted,
    0
  );

  let failureHotspot: { file: FileStats; failures: number; pct: number } | null = null;
  if (totalFailures > 0) {
    const worstFile = [...fileStats].sort(
      (a, b) => b.failed + b.timedOut + b.interrupted - (a.failed + a.timedOut + a.interrupted)
    )[0];
    const worstFailures = worstFile.failed + worstFile.timedOut + worstFile.interrupted;
    if (worstFailures > 0) {
      failureHotspot = {
        file: worstFile,
        failures: worstFailures,
        pct: Math.round((worstFailures / totalFailures) * 100),
      };
    }
  }

  // Count files with flaky tests (retries)
  const flakyFilesCount = fileStats.filter((f) => f.flakyCount > 0).length;
  const flakyFilesPct = totalFiles > 0 ? Math.round((flakyFilesCount / totalFiles) * 100) : 0;

  // Top 5 longest running files for bottleneck list
  const topBottlenecks = sortedByDuration.slice(0, 5);
  const maxDuration = slowestFile ? slowestFile.totalDuration : 1;

  const kpiCards = [
    {
      label: 'Total Spec Files',
      value: `${totalFiles}`,
      subtext: `${totalTests} total test cases`,
      description: 'Total number of spec files executed in this test run',
      badgeClass: 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400',
    },
    {
      label: 'Clean Spec Files',
      value: `${cleanFilesCount} (${cleanFilesPct}%)`,
      subtext: '100% test pass rate in file',
      description: 'Files where all test cases passed cleanly without errors',
      badgeClass:
        cleanFilesPct >= 80
          ? 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-400'
          : 'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400',
    },
    {
      label: 'Failing Spec Files',
      value: `${failingFilesCount}`,
      subtext:
        failingFilesCount > 0
          ? `${failingFilesPct}% of files have errors`
          : '0 files with failures',
      description: 'Count of spec files containing 1+ failed or timed-out test cases',
      badgeClass:
        failingFilesCount > 0
          ? 'bg-danger-500/10 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400'
          : 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-400',
    },
    {
      label: 'Files with Retries',
      value: `${flakyFilesCount}`,
      subtext:
        flakyFilesCount > 0
          ? `${flakyFilesPct}% of files required retries`
          : '0 files with retries',
      description:
        'Count of spec files containing tests that failed initial execution but passed after retries in this run',
      badgeClass:
        flakyFilesCount > 0
          ? 'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400'
          : 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-400',
    },
    {
      label: 'Failure Concentration',
      value: failureHotspot ? `${failureHotspot.pct}%` : '0%',
      subtext: failureHotspot
        ? truncateMiddlePath(failureHotspot.file.fileName)
        : 'No failure concentration',
      title: failureHotspot?.file.fileName,
      description: 'Highest percentage of overall suite failures originating from a single file',
      badgeClass: failureHotspot
        ? 'bg-danger-500/10 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400'
        : 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-400',
    },
  ];

  const distributionSubCards = [
    {
      title: 'Avg Tests per File',
      value: `${avgTestsPerFile}`,
      unit: 'tests/file',
      description:
        'Average number of test cases contained within each spec file (Total Tests ÷ Total Files)',
    },
    {
      title: 'Avg Spec Duration',
      value: formatDuration(avgFileDuration),
      unit: '',
      description: 'Average execution duration per spec file (Total Cumulative Time ÷ Total Files)',
    },
    {
      title: 'Highest Test Density',
      value: highestDensityFile ? highestDensityFile.fileName : 'N/A',
      isFileName: true,
      subValue: highestDensityFile ? `${highestDensityFile.total} tests` : '',
      description: 'Spec file containing the largest number of individual test cases',
    },
    {
      title: 'Files with Retries',
      value: `${flakyFilesCount}`,
      unit: `(${flakyFilesPct}%)`,
      description:
        'Count and percentage of spec files containing tests that required retries to pass in this run',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 5 KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpiCards.map((card, index) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            subtext={card.subtext}
            description={card.description}
            badgeClass={card.badgeClass}
            title={card.title}
            isFirst={index === 0}
            isLast={index === kpiCards.length - 1}
          />
        ))}
      </div>

      {/* Secondary Metrics & Bottlenecks Grid */}
      {!isMinimalReport && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Spec File Density & Distribution */}
          <div className="rounded-md bg-canvas border border-border-default p-4 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted mb-3">
                File Density & Distribution
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {distributionSubCards.map((card, index) => {
                  const isRightCol = index % 2 === 1;
                  const subTooltipPosClass = isRightCol
                    ? 'right-0 translate-x-0'
                    : 'left-1/2 -translate-x-1/2';
                  const subArrowPosClass = isRightCol
                    ? 'right-2.5 translate-x-0'
                    : 'left-1/2 -translate-x-1/2';

                  return (
                    <div
                      key={card.title}
                      className="rounded border border-border-default dark:border-border-subtle bg-canvas-subtle p-3 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-medium text-text-body-mid dark:text-text-muted">
                          {card.title}
                        </p>
                        <div className="group relative inline-flex items-center">
                          <svg
                            className="h-3.5 w-3.5 cursor-help text-text-body-mid opacity-60 hover:opacity-100 dark:text-text-muted transition-opacity shrink-0"
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
                          <div
                            className={`pointer-events-none absolute bottom-full mb-2 hidden group-hover:block z-50 w-48 rounded bg-slate-900 dark:bg-slate-800 p-2 text-center text-xs text-white shadow-lg ring-1 ring-slate-700 ${subTooltipPosClass}`}
                          >
                            {card.description}
                            <div
                              className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800 ${subArrowPosClass}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-1.5">
                        {card.isFileName ? (
                          <div>
                            <p
                              className="text-sm font-bold text-text-ink dark:text-text-on-primary truncate"
                              title={card.value}
                            >
                              {card.value}
                            </p>
                            {card.subValue && (
                              <p className="text-xs text-text-muted font-medium mt-0.5">
                                {card.subValue}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-text-ink dark:text-text-on-primary">
                            {card.value}{' '}
                            {card.unit && (
                              <span className="text-xs font-normal text-text-muted">
                                {card.unit}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Bottleneck Spec Files */}
          <div className="rounded-md bg-canvas border border-border-default p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
                  Longest Execution Spec Files
                </h3>
                <span className="text-xs text-text-muted font-mono">Top 5 by Duration</span>
              </div>

              <div className="space-y-2.5">
                {topBottlenecks.map((file) => {
                  const barPercentage =
                    maxDuration > 0 ? Math.round((file.totalDuration / maxDuration) * 100) : 0;
                  return (
                    <div key={file.fileName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="font-medium text-text-ink dark:text-text-on-primary truncate max-w-50 sm:max-w-65"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-text-muted font-mono text-[11px]">
                            {file.total} {file.total === 1 ? 'test' : 'tests'}
                          </span>
                          <span className="font-semibold text-text-ink dark:text-text-on-primary font-mono text-[11px]">
                            {formatDuration(file.totalDuration)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-cafe dark:bg-success-500 transition-all duration-300"
                          style={{ width: `${Math.max(barPercentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
