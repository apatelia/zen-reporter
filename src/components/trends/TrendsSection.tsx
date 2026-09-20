import type { HistoryData, TestSuite } from '@/lib/types';
import PassRateTrend from '@/components/trends/PassRateTrend';
import DurationTrend from '@/components/trends/DurationTrend';
import StepCategoryTrend from '@/components/trends/StepCategoryTrend';

interface Props {
  history: HistoryData | null;
  suites: TestSuite[];
}

export default function TrendsSection({ history, suites }: Props) {
  if (!history) {
    return (
      <div className="space-y-6">
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
          Historical Trends
        </h2>
        {/* Step Category Composition for current run can still display even without history */}
        <StepCategoryTrend suites={suites} history={null} />
        <div className="flex items-center justify-center py-16 text-center rounded-md border border-border-default bg-surface-50 p-6">
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-surface-100 border border-border-default">
              <svg
                className="h-8 w-8 text-text-ink dark:text-text-on-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary">
              No historical trend data
            </h3>
            <p className="mt-1.5 text-sm text-text-body-mid dark:text-text-muted">
              Run{' '}
              <code className="rounded bg-surface-200 px-1.5 py-0.5 text-xs font-mono font-semibold text-text-ink dark:text-text-on-primary border border-border-default">
                npx zr history report
              </code>{' '}
              after your test runs to populate historical pass rate and duration trends.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
        Historical Trends
      </h2>

      {/* 1. Pass Rate Trend Section */}
      <PassRateTrend history={history} />

      {/* 2. Duration Trend Section */}
      <DurationTrend history={history} />

      {/* 3. Step Category Composition & Trend Section */}
      <StepCategoryTrend suites={suites} history={history} />
    </div>
  );
}
