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
import type { ResultSummary, TestSuite } from '@/lib/types';
import { LearnMoreButton } from '@/components/shared';

const colorMap: Record<string, string> = {
  Passed: 'var(--color-success-500)',
  Failed: 'var(--color-danger-500)',
  Interrupted: 'var(--color-danger-600)',
  Skipped: 'var(--color-text-muted)',
  'Timed Out': 'var(--color-warning-500)',
};

const LegendFormatter = (value: string) => {
  return (
    <span style={{ color: 'var(--color-text-ink)', fontSize: '12px', fontWeight: 500 }}>
      {value}
    </span>
  );
};

const renderProjectSummaryTooltip = (props: TooltipContentProps) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="p-2.5 text-text-ink dark:text-text-on-primary">
      <div className="font-bold text-xs mb-1.5 border-b border-border-default pb-1">{label}</div>
      <div className="space-y-1 text-xs">
        {payload.map((entry) => {
          const val = Number(entry.value);
          if (val <= 0) return null;
          const seriesColor = colorMap[String(entry.name)] || entry.color;
          return (
            <div
              key={String(entry.name)}
              className="flex items-center justify-between gap-4 font-medium"
            >
              <span className="flex items-center gap-1.5 text-text-ink dark:text-text-on-primary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seriesColor }} />
                {entry.name}:
              </span>
              <span className="font-bold tabular-nums text-text-ink dark:text-text-on-primary">
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface Props {
  summary?: ResultSummary;
  suites: TestSuite[];
  title?: string;
}

interface ChartDataItem {
  name: string;
  Passed: number;
  Failed: number;
  Interrupted: number;
  Skipped: number;
  'Timed Out': number;
}

export default function ProjectBarCharts({ suites, title = 'Projects Summary' }: Props) {
  const [showModal, setShowModal] = useState(false);
  const allCases = collectAllCases(suites);
  const projectStats = computeProjectStats(allCases);

  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const data: ChartDataItem[] = projectStats.map((project) => ({
    name: project.name,
    Passed: project.passed,
    Failed: project.failed,
    Interrupted: project.interrupted,
    Skipped: project.skipped,
    'Timed Out': project.timedOut,
  }));

  const chartHeight = Math.max(300, projectStats.length * 40 + 80);

  return (
    <div className="rounded-md bg-canvas border border-border-default px-6 py-6 shadow-sm flex flex-col justify-between">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-ink dark:text-text-on-primary">{title}</h3>
          <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
            Stacked status breakdown across project profiles
          </p>
        </div>

        <LearnMoreButton onClick={() => setShowModal(true)} />
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
          barSize={18}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-chart)"
            horizontal={false}
          />
          <XAxis
            type="number"
            fontSize={12}
            tick={{ fill: 'var(--color-text-muted)' }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            fontSize={12}
            width={yAxisWidth}
            tick={{ fill: 'var(--color-text-muted)' }}
            tickFormatter={(val: string) =>
              val.length === maxLen && maxLen > 0 ? `\u00A0${val}` : val
            }
          />
          <Tooltip
            content={renderProjectSummaryTooltip}
            wrapperStyle={{
              backgroundColor: 'var(--color-surface-100)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              outline: 'none',
            }}
          />
          <Legend
            formatter={LegendFormatter}
            iconType="circle"
            wrapperStyle={{
              paddingTop: '8px',
              textAlign: 'center',
              width: '100%',
              fontSize: '12px',
            }}
          />
          <Bar
            dataKey="Passed"
            stackId="status"
            fill="var(--color-success-500)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Failed"
            stackId="status"
            fill="var(--color-danger-500)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Interrupted"
            stackId="status"
            fill="var(--color-danger-600)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Skipped"
            stackId="status"
            fill="var(--color-text-muted)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Timed Out"
            stackId="status"
            fill="var(--color-warning-500)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Learn More Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-lg bg-canvas border border-border-default p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <h4 className="text-base font-bold text-text-ink dark:text-text-on-primary">
                About Status Breakdown by Project
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-text-muted hover:bg-surface-100 hover:text-text-ink transition-colors cursor-pointer"
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
                This horizontal stacked bar chart displays the distribution of test execution
                outcomes for each configured Playwright project profile (e.g., Chromium, Firefox,
                WebKit, Mobile Chrome).
              </p>

              <div>
                <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
                  Status Categories:
                </h5>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong className="text-success-600 dark:text-success-500">Passed:</strong>{' '}
                    Tests that executed and satisfied all assertion checks within timeout limits.
                  </li>
                  <li>
                    <strong className="text-danger-600 dark:text-danger-500">Failed:</strong> Hard
                    assertion failures or unhandled runtime exceptions.
                  </li>
                  <li>
                    <strong className="text-warning-600 dark:text-warning-500">Timed Out:</strong>{' '}
                    Tests exceeding the configured Playwright project timeout limit.
                  </li>
                  <li>
                    <strong className="text-danger-700 dark:text-danger-400">Interrupted:</strong>{' '}
                    Tests cancelled due to worker signals or parent run aborts.
                  </li>
                  <li>
                    <strong className="text-text-muted">Skipped:</strong> Tests conditionally
                    bypassed (
                    <code className="font-mono bg-surface-100 px-1 py-0.5 rounded text-[10px]">
                      test.skip()
                    </code>
                    ).
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
                  Diagnostic Insights:
                </h5>
                <p>
                  Comparing status stacks across projects allows you to immediately pinpoint
                  browser-specific regressions. If failures concentrate in WebKit while Chromium
                  passes, focus debugging on Safari rendering standards or engine differences.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md bg-accent-blue px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-accent-blue/90 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
