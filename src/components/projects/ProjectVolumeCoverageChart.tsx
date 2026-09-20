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
import type { ProjectStats } from '@/lib/utils';
import { LearnMoreButton } from '@/components/shared';

interface Props {
  projectStats: ProjectStats[];
  title?: string;
}

const colorMap: Record<string, string> = {
  Executed: 'var(--color-success-500)',
  Skipped: 'var(--color-text-muted)',
};

const LegendFormatter = (value: string) => {
  return (
    <span style={{ color: colorMap[value] || 'var(--color-text-muted)', fontSize: '12px' }}>
      {value}
    </span>
  );
};

interface ChartDataItem {
  name: string;
  Executed: number;
  Skipped: number;
  'Coverage Density (%)': number;
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
          <span className="text-text-body-mid dark:text-text-muted">Total Tests:</span>
          <span className="font-bold tabular-nums">{data.total}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-success-600 dark:text-success-500">
            <span className="h-2 w-2 rounded-full bg-success-500" />
            Executed Tests:
          </span>
          <span className="font-bold tabular-nums">{data.Executed}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Skipped Tests:
          </span>
          <span className="font-bold tabular-nums">{data.Skipped}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border-default font-semibold">
          <span className="text-emerald-600 dark:text-emerald-400">Coverage Density:</span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {data['Coverage Density (%)']}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ProjectVolumeCoverageChart({
  projectStats,
  title = 'Test Volume & Coverage Density per Project',
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const data: ChartDataItem[] = projectStats.map((p) => {
    const executed = p.total - p.skipped;
    const coverageDensity = p.total > 0 ? Math.round((executed / p.total) * 100) : 0;
    return {
      name: p.name,
      Executed: executed,
      Skipped: p.skipped,
      'Coverage Density (%)': coverageDensity,
      total: p.total,
    };
  });

  const chartHeight = Math.max(300, projectStats.length * 40 + 80);

  return (
    <div className="rounded-md bg-canvas border border-border-default px-6 py-6 shadow-sm flex flex-col justify-between">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-ink dark:text-text-on-primary">{title}</h3>
          <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
            Executed vs skipped test load and active test coverage density across projects
          </p>
        </div>

        <LearnMoreButton onClick={() => setShowModal(true)} />
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          barSize={18}
          barGap={4}
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
            dataKey="Executed"
            stackId="a"
            fill="var(--color-success-500)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Skipped"
            stackId="a"
            fill="var(--color-border-chart)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-lg border border-border-default bg-canvas p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">
                  About Test Volume & Coverage Density
                </h3>
                <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                  Understanding test suite distribution and active execution coverage
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
                This chart benchmarks the total test case load and execution density across
                configured target project profiles (browsers and platforms).
              </p>

              <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
                  Key Metrics:
                </div>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>
                    <strong className="text-sky-600 dark:text-sky-400">Executed Tests:</strong>{' '}
                    Active test cases that ran to completion (Passed, Failed, Timed Out, or
                    Interrupted).
                  </li>
                  <li>
                    <strong className="text-slate-600 dark:text-slate-400">Skipped Tests:</strong>{' '}
                    Test cases bypassed via{' '}
                    <code className="bg-surface-200 px-1 rounded">test.skip()</code> or conditional
                    tags.
                  </li>
                  <li>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      Coverage Density (%):
                    </strong>{' '}
                    The ratio of executed tests over total tests (
                    <code className="bg-surface-200 px-1 rounded">Executed / Total * 100</code>).
                  </li>
                </ul>
              </div>

              <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
                  Operational Guidelines:
                </div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure all target environments maintain high coverage density (≥95%).</li>
                  <li>
                    Unintended gaps between environments reveal browser-specific skips or
                    conditional test exclusions.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-default">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md bg-accent-blue px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
