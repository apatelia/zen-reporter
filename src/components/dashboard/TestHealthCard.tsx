import type { TestSuite } from '@/lib/types/report';
import { collectAllCases } from '@/lib/statsUtils';

export interface TestHealthCardProps {
  suites: TestSuite[];
}

export default function TestHealthCard({ suites }: TestHealthCardProps) {
  const allCases = collectAllCases(suites);
  const totalCases = allCases.length;

  let flakyCount = 0;
  let directPassCount = 0;
  let hardFailCount = 0;
  let skippedCount = 0;

  allCases.forEach((tc) => {
    const hasFailedAttempts = Boolean(tc.failedAttempts && tc.failedAttempts.length > 0);
    if (tc.status === 'passed') {
      if (hasFailedAttempts) {
        flakyCount++;
      } else {
        directPassCount++;
      }
    } else if (tc.status === 'skipped') {
      skippedCount++;
    } else {
      hardFailCount++;
    }
  });

  const executedCount = totalCases - skippedCount;
  const flakyRate = executedCount > 0 ? Math.round((flakyCount / executedCount) * 100) : 0;

  let badgeClass = 'bg-success-500/10 text-success-600 dark:text-success-500 border-success-500/20';
  let badgeLabel = '✓ 100% Stable';

  if (hardFailCount > 0) {
    badgeClass = 'bg-danger-500/10 text-danger-600 dark:text-danger-500 border-danger-500/20';
    badgeLabel =
      flakyCount > 0
        ? `✗ ${hardFailCount} Failed, ${flakyCount} Flaky`
        : `✗ ${hardFailCount} Failed`;
  } else if (flakyCount > 0) {
    badgeClass = 'bg-warning-500/10 text-warning-600 dark:text-warning-500 border-warning-500/20';
    badgeLabel = `⚠️ ${flakyCount} Flaky`;
  } else if (executedCount === 0) {
    badgeClass = 'bg-surface-200/50 text-text-muted border-border-default';
    badgeLabel = 'No Executed Tests';
  }

  return (
    <div className="flex flex-col justify-between w-full h-full rounded-md bg-canvas border border-border-default p-5 shadow-xs">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
            Test Stability & Flakiness
          </h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badgeClass}`}
          >
            {badgeLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
          Retry behavior and stability breakdown across executed tests
        </p>
      </div>

      {/* Main Flakiness Rate Metric */}
      <div className="my-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-text-ink dark:text-text-on-primary">
          {flakyRate}%
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
          Flakiness Rate ({flakyCount}/{executedCount} executed tests recovered)
        </span>
      </div>

      {/* Stability breakdown badges */}
      <div className="flex w-full flex-col gap-y-1 mt-auto">
        <div className="flex w-full items-center justify-between rounded-md border border-border-default/50 px-2.5 py-1.5 bg-surface-100/50 dark:bg-surface-100/30">
          <div className="flex items-center">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-success-500" />
            <span className="text-xs font-medium text-text-ink dark:text-text-on-primary">
              Direct Passes
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-text-body-mid dark:text-text-muted">
            {directPassCount}
          </span>
        </div>

        <div className="flex w-full items-center justify-between rounded-md border border-border-default/50 px-2.5 py-1.5 bg-surface-100/50 dark:bg-surface-100/30">
          <div className="flex items-center">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-warning-500" />
            <span className="text-xs font-medium text-text-ink dark:text-text-on-primary">
              Flaky / Recovered
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-text-body-mid dark:text-text-muted">
            {flakyCount}
          </span>
        </div>

        <div className="flex w-full items-center justify-between rounded-md border border-border-default/50 px-2.5 py-1.5 bg-surface-100/50 dark:bg-surface-100/30">
          <div className="flex items-center">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-danger-500" />
            <span className="text-xs font-medium text-text-ink dark:text-text-on-primary">
              Unresolved Failures
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-text-body-mid dark:text-text-muted">
            {hardFailCount}
          </span>
        </div>

        {skippedCount > 0 && (
          <div className="flex w-full items-center justify-between rounded-md border border-border-default/50 px-2.5 py-1.5 bg-surface-100/50 dark:bg-surface-100/30">
            <div className="flex items-center">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span className="text-xs font-medium text-text-ink dark:text-text-on-primary">
                Skipped (Unexecuted)
              </span>
            </div>
            <span className="text-xs font-mono font-medium text-text-body-mid dark:text-text-muted">
              {skippedCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
