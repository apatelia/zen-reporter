import type { ReactNode } from 'react';
import type { ResultSummary, TestSuite } from '@arpanp/zen-core';
import { formatDuration } from '@arpanp/zen-core';
import { computeStatusPercentages } from '@arpanp/zen-core';
import PassRateRing from './PassRateRing';

export interface TestResultsHeroProps {
  summary: ResultSummary;
  suites: TestSuite[];
}

interface ResultBreakdownItem {
  label: string;
  subTitle?: string;
  value: number;
  pct: number;
  color: string;
  text: string;
  bg: string;
  icon: ReactNode;
}

/**
 * Renders executive dashboard summary hero card including metadata strip,
 * pass rate gauge ring, progress breakdown bar, and 6-status outcome cards.
 *
 * @param props - Component props containing summary metrics and suites array.
 * @returns React functional component rendering the test results hero section.
 */
export default function TestResultsHero({ summary, suites }: TestResultsHeroProps) {
  const statusPercents = computeStatusPercentages(summary);
  const isParallel = Boolean(summary.workers && summary.workers > 1);

  const items: ResultBreakdownItem[] = [
    {
      label: 'Passed',
      subTitle: 'First Run',
      value: summary.passed,
      pct: statusPercents.passed,
      color: 'bg-success-500',
      text: 'text-success-600 dark:text-success-500',
      bg: 'bg-success-500/5 dark:bg-success-500/10 border-success-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      label: 'Flaky',
      subTitle: 'Recovered',
      value: summary.flaky ?? 0,
      pct: statusPercents.flaky,
      color: 'bg-warning-500',
      text: 'text-warning-600 dark:text-warning-500',
      bg: 'bg-warning-500/5 dark:bg-warning-500/10 border-warning-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    {
      label: 'Failed',
      value: summary.failed,
      pct: statusPercents.failed,
      color: 'bg-danger-500',
      text: 'text-danger-600 dark:text-danger-500',
      bg: 'bg-danger-500/5 dark:bg-danger-500/10 border-danger-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    {
      label: 'Timed Out',
      value: summary.timedOut,
      pct: statusPercents.timedOut,
      color: 'bg-danger-600 dark:bg-danger-400',
      text: 'text-danger-700 dark:text-danger-400',
      bg: 'bg-danger-600/5 dark:bg-danger-400/10 border-danger-600/25 dark:border-danger-400/25',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
    },
    {
      label: 'Interrupted',
      value: summary.interrupted ?? 0,
      pct: statusPercents.interrupted,
      color: 'bg-amber-600 dark:bg-amber-500',
      text: 'text-amber-600 dark:text-amber-500',
      bg: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      ),
    },
    {
      label: 'Skipped',
      value: summary.skipped,
      pct: statusPercents.skipped,
      color: 'bg-slate-400 dark:bg-slate-500',
      text: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-500/5 dark:bg-slate-400/10 border-slate-500/20 dark:border-slate-400/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full rounded-md border border-border-default bg-surface-50 p-5 shadow-xs">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        {/* Left Side: Pass Rate Gauge */}
        <div className="flex flex-col items-center justify-between border-b border-border-default pb-5 lg:w-64 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6 dark:border-white/15">
          <PassRateRing
            passRate={statusPercents.passRate}
            cleanPassed={summary.passed}
            flakyCount={summary.flaky ?? 0}
            total={summary.total}
          />
        </div>

        {/* Right Side: Integrated Unbordered Metadata Strip + Execution Breakdown */}
        <div className="flex-1 flex flex-col justify-between">
          {/* Integrated Test Run Info Header */}
          <div className="border-b border-border-default pb-2.5 mb-2 space-y-1.5 dark:border-white/15">
            <div className="flex items-center">
              <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
                Test Run Info
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Duration:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {formatDuration(summary.duration)}
                </span>
              </div>

              <div className="h-3.5 w-px bg-border-default dark:bg-white/20" />

              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Projects:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {summary.numberOfProjects}
                </span>
              </div>

              <div className="h-3.5 w-px bg-border-default dark:bg-white/20" />

              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Suites:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {suites.length}
                </span>
              </div>

              <div className="h-3.5 w-px bg-border-default dark:bg-white/20" />

              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Tests:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {summary.total}
                </span>
              </div>

              <div className="h-3.5 w-px bg-border-default dark:bg-white/20" />

              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Workers:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {isParallel ? `${summary.workers} Workers` : '1 Worker'}
                </span>
              </div>

              {summary.playwrightVersion && (
                <>
                  <div className="h-3.5 w-px bg-border-default dark:bg-white/20" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-body-mid dark:text-text-muted font-semibold">
                      Playwright:
                    </span>
                    <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                      v{summary.playwrightVersion}
                    </span>
                  </div>
                </>
              )}

              {summary.osName && (
                <>
                  <div className="h-3.5 w-px bg-border-default dark:bg-white/20" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-body-mid dark:text-text-muted font-semibold">
                      OS:
                    </span>
                    <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                      {summary.osName}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Section: Breakdown Header + Progress Bar + 5 Status Cards Grid */}
          <div className="space-y-3.5 mt-auto">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
                  Test Results & Breakdown
                </h3>
                <p className="text-xs text-text-body-mid dark:text-text-muted">
                  Distribution across {summary.total} total test case execution outcomes
                </p>
              </div>
            </div>

            {/* Multi-segmented Progress Bar */}
            <div className="h-6 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-200 flex">
              {items.map((item) =>
                item.pct > 0 ? (
                  <div
                    key={item.label}
                    className={`h-full ${item.color} transition-all duration-300`}
                    style={{ width: `${item.pct}%` }}
                    title={`${item.label}: ${item.value} (${item.pct}%)`}
                  />
                ) : null
              )}
            </div>

            {/* 6 Status Cards Grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {items.map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col justify-between rounded-md border p-2 sm:p-2.5 shadow-2xs transition-all ${item.bg}`}
                >
                  <div className="flex items-start justify-between gap-1 text-xs font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.subTitle ? (
                        <span className="text-[10px] font-normal lowercase tracking-normal opacity-70 leading-tight truncate">
                          ({item.subTitle})
                        </span>
                      ) : (
                        <span className="text-[10px] leading-tight invisible select-none">
                          &nbsp;
                        </span>
                      )}
                    </div>
                    <span className={`shrink-0 mt-0.5 ${item.text}`}>{item.icon}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-1">
                    <span className={`text-xl sm:text-2xl font-bold truncate ${item.text}`}>
                      {item.value}
                    </span>
                    <span className="text-xs font-medium text-text-body-mid dark:text-text-muted shrink-0">
                      {item.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
