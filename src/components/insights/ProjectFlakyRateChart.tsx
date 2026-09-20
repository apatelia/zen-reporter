import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipContentProps,
} from 'recharts';
import { computeProjectStats, collectAllCases } from '@/lib/utils';
import { LearnMoreButton } from '@/components/shared';
import type { TestSuite } from '@/lib/types';

interface Props {
  suites: TestSuite[];
  title?: string;
}

interface ChartDataItem {
  name: string;
  'Flaky Tests': number;
  'Flaky Rate (%)': number;
  total: number;
}

const renderTooltip = (props: TooltipContentProps) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as ChartDataItem;
  if (!data) return null;

  return (
    <div className="p-3 text-text-ink dark:text-text-on-primary">
      <div className="font-bold text-xs mb-1 border-b border-border-default pb-1">{label}</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-text-body-mid dark:text-text-muted">Total Tests Evaluated:</span>
          <span className="font-bold tabular-nums">{data.total}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-warning-600 dark:text-warning-500">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--color-warning-500)' }}
            />
            Flaky Test Cases:
          </span>
          <span className="font-bold tabular-nums text-warning-600 dark:text-warning-500">
            {data['Flaky Tests']}
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border-default font-semibold">
          <span className="text-warning-600 dark:text-warning-500">Flakiness Rate:</span>
          <span className="font-bold tabular-nums text-warning-600 dark:text-warning-500">
            {data['Flaky Rate (%)']}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ProjectFlakyRateChart({
  suites,
  title = 'Flaky Test Count & Retry Rate by Project',
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const allCases = collectAllCases(suites);
  const projectStats = computeProjectStats(allCases);

  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const data: ChartDataItem[] = projectStats.map((p) => ({
    name: p.name,
    'Flaky Tests': p.flakyCount,
    'Flaky Rate (%)': p.flakyRate,
    total: p.total,
  }));

  const hasFlakyData = projectStats.length > 0 && data.some((d) => d['Flaky Tests'] > 0);

  return (
    <div className="rounded-md bg-surface-50 border border-border-default p-5 shadow-xs flex flex-col justify-between">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">{title}</h3>
          <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
            Cross-project comparison of unstable/flaky test occurrences and retry dependency
          </p>
        </div>

        <LearnMoreButton onClick={() => setShowModal(true)} />
      </div>

      {!hasFlakyData ? (
        <div className="flex h-65 flex-col items-center justify-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-200 text-text-muted">
            <svg
              className="h-5 w-5 text-text-body-mid dark:text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-ink dark:text-text-on-primary">
            No flaky tests detected
          </p>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            All test cases executed without requiring retries to pass.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            barSize={18}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-chart)"
              horizontal={false}
            />
            <XAxis type="number" fontSize={12} tick={{ fill: 'var(--color-text-muted)' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={yAxisWidth}
              fontSize={12}
              tick={{ fill: 'var(--color-text-ink)' }}
            />
            <Tooltip
              content={renderTooltip}
              wrapperStyle={{
                backgroundColor: 'var(--color-surface-100)',
                border: '1px solid var(--color-border-default)',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                outline: 'none',
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
            />
            <Bar dataKey="Flaky Tests" fill="var(--color-warning-500)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-lg border border-border-default bg-canvas p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">
                  Flaky Test Count & Retry Analytics Guide
                </h3>
                <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                  Analyzing cross-project test instability and environmental flakiness
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors cursor-pointer"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
              <p>
                A test case is classified as{' '}
                <strong className="text-warning-600 dark:text-warning-500">Flaky</strong> when it is
                non-deterministic and recorded BOTH passed and failed outcomes across test
                executions (minimum 1 failure and 1 success).
              </p>

              <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
                  Diagnostic Value by Project Profile:
                </div>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Browser Specific Flakiness:</strong> Compare WebKit, Chromium, and
                    Firefox to isolate rendering engine timing bugs.
                  </li>
                  <li>
                    <strong>Viewport & Mobile Emulation:</strong> Identify if responsive layout
                    tests flake on mobile viewports due to animation delays.
                  </li>
                  <li>
                    <strong>Retry Overhead:</strong> Flaky tests double execution latency.
                    Eliminating flakiness speeds up overall CI build time.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-default">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md bg-accent-blue px-4 py-2 text-xs font-bold text-text-on-primary hover:bg-accent-blue/90 transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
