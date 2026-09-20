import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryData } from '@/lib/types';
import { formatDateParts } from '@/lib/utils';
import { LearnMoreButton } from '@/components/shared';

interface PassRateTrendProps {
  history: HistoryData;
}

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-5 shadow-xs';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

const renderTrendTick = ({
  x,
  y,
  payload,
}: {
  x: number | string;
  y: number | string;
  payload: { value: unknown };
}) => {
  const tickX = Number(x);
  const tickY = Number(y);
  const [dateLine, timeLine] = formatDateParts(String(payload.value));
  return (
    <g>
      <text
        x={tickX}
        y={tickY + 10}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill="var(--color-text-ink)"
      >
        {dateLine}
      </text>
      <text
        x={tickX}
        y={tickY + 24}
        textAnchor="middle"
        fontSize={11}
        fill="var(--color-text-body-mid)"
      >
        {timeLine}
      </text>
    </g>
  );
};

const renderTrendTooltip = (props: TooltipContentProps) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const [dateLine, timeLine] = formatDateParts(String(label));
  const rate = payload[0]?.value;
  return (
    <div className="p-2.5 text-text-ink dark:text-text-on-primary">
      <div className="font-bold text-xs">{dateLine}</div>
      <div className="text-[11px] text-text-body-mid dark:text-text-muted">{timeLine}</div>
      <div className="mt-1.5 text-xs font-medium">
        Pass rate: <span className="font-bold text-success-600 dark:text-success-500">{rate}%</span>
      </div>
    </div>
  );
};

export default function PassRateTrend({ history }: PassRateTrendProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const chartRuns = (history.runs || []).slice(-15).map((run) => ({
    ...run,
    pass_rate: run.pass_rate ?? 0,
  }));

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className={headingClass}>Pass rate trend</h2>
          <LearnMoreButton onClick={() => setIsModalOpen(true)} />
        </div>
      </div>
      {history.runs.length > 15 && (
        <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
          Showing the 15 most recent runs
        </p>
      )}
      {chartRuns.length < 2 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6 space-y-2 mt-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-200 border border-border-default text-text-body-mid dark:text-text-muted">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <p className="text-xs font-semibold text-text-ink dark:text-text-on-primary">
            Historical trend chart requires at least 2 test runs
          </p>
          <p className="text-[11px] text-text-body-mid dark:text-text-muted max-w-md">
            Execute future runs and run{' '}
            <code className="rounded bg-surface-200 px-1.5 py-0.5 font-mono text-[10px] text-text-ink dark:text-text-on-primary border border-border-default">
              npx zr history report
            </code>{' '}
            to visualize pass rate trends across runs over time.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={chartRuns} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-chart)" />
              <XAxis
                dataKey="started_at"
                fontSize={11}
                height={48}
                interval={0}
                tick={renderTrendTick}
              />
              <YAxis
                domain={[0, 100]}
                fontSize={11}
                fontWeight={500}
                tick={{ fill: 'var(--color-text-ink)' }}
                unit="%"
              />
              <Tooltip
                content={renderTrendTooltip}
                wrapperStyle={{
                  backgroundColor: 'var(--color-surface-100)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  outline: 'none',
                }}
              />
              <Line
                type="monotone"
                dataKey="pass_rate"
                stroke="var(--color-success-500)"
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: 'var(--color-success-500)',
                  stroke: 'var(--color-surface-50)',
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 6,
                  fill: 'var(--color-success-500)',
                  stroke: 'var(--color-surface-50)',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Dynamic Modal Guide Component */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-lg border border-border-default bg-canvas p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border-default pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-text-ink dark:text-text-on-primary">
                  Pass Rate Trend Guide
                </h3>
                <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
                  Metric definitions, targets, and diagnostic guidelines for Zen Reporter
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors cursor-pointer"
                title="Close guide"
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

            {/* Pass Rate Guide Content */}
            <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
              <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
                <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary">
                  Target Thresholds
                </h4>
                <p>
                  • <strong className="text-success-600 dark:text-success-500">&gt;= 95%:</strong>{' '}
                  Target operational health for CI production pipelines.
                </p>
                <p>
                  • <strong className="text-warning-600 dark:text-warning-500">85% – 94%:</strong>{' '}
                  Elevated flakiness or minor regressions needing attention.
                </p>
                <p>
                  • <strong className="text-danger-600 dark:text-danger-500">&lt; 85%:</strong>{' '}
                  Pipeline instability requiring immediate remediation.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border-default pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md bg-accent-blue px-4 py-2 text-xs font-bold text-white hover:bg-accent-blue/90 dark:bg-success-500 dark:text-slate-900 transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
