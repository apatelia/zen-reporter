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
} from 'recharts';
import type { ProjectStats } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import { LearnMoreButton } from '@/components/shared';

interface Props {
  projectStats: ProjectStats[];
  title?: string;
  className?: string;
}

interface ChartDataItem {
  name: string;
  'Avg Duration (s)': number;
  'P95 Duration (s)': number;
  avgRawMs: number;
  p95RawMs: number;
  totalRawMs: number;
}

const colorMap: Record<string, string> = {
  'Avg Duration (s)': 'var(--color-accent-green)',
  'P95 Duration (s)': 'var(--color-accent-house)',
};

const LegendFormatter = (value: string) => {
  return (
    <span
      style={{
        color: colorMap[value] || 'var(--color-text-ink)',
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      {value}
    </span>
  );
};

export default function ProjectDurationChart({
  projectStats,
  title = 'Execution Duration & Latency Benchmark',
  className = 'rounded-md bg-canvas border border-border-default px-6 py-6 shadow-sm flex flex-col justify-between',
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const data: ChartDataItem[] = projectStats.map((p) => ({
    name: p.name,
    'Avg Duration (s)': Math.round((p.avgDuration / 1000) * 100) / 100,
    'P95 Duration (s)': Math.round((p.p95Duration / 1000) * 100) / 100,
    avgRawMs: p.avgDuration,
    p95RawMs: p.p95Duration,
    totalRawMs: p.totalDuration,
  }));

  return (
    <div className={className}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-ink dark:text-text-on-primary">{title}</h3>
          <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
            Average vs P95 execution duration per test case across projects
          </p>
        </div>

        <LearnMoreButton onClick={() => setShowModal(true)} />
      </div>

      <ResponsiveContainer width="100%" height={300}>
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
          <XAxis type="number" fontSize={12} tick={{ fill: 'var(--color-text-muted)' }} unit="s" />
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
            contentStyle={{
              backgroundColor: 'var(--color-surface-100)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value, name, item) => {
              const valNum = typeof value === 'number' ? value : Number(value);
              const payload = item.payload as ChartDataItem;
              if (name === 'Avg Duration (s)') {
                return [`${formatDuration(payload.avgRawMs)} (${valNum}s)`, 'Avg / Test'];
              }
              if (name === 'P95 Duration (s)') {
                return [`${formatDuration(payload.p95RawMs)} (${valNum}s)`, 'P95 Latency'];
              }
              return [`${valNum}s`, String(name)];
            }}
          />
          <Legend
            iconType="circle"
            formatter={LegendFormatter}
            wrapperStyle={{
              paddingTop: '8px',
              textAlign: 'center',
              width: '100%',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="Avg Duration (s)" fill="var(--color-accent-green)" radius={[0, 4, 4, 0]} />
          <Bar dataKey="P95 Duration (s)" fill="var(--color-accent-house)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Learn More Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-lg bg-canvas border border-border-default p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <h4 className="text-base font-bold text-text-ink dark:text-text-on-primary">
                About Duration & P95 Latency Benchmark
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
                This chart benchmarks the execution latency per test case across project targets,
                comparing average duration against 95th percentile (P95) latency.
              </p>

              <div>
                <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
                  Key Metrics Explained:
                </h5>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <strong className="text-accent-blue">Avg Duration (s):</strong> Calculated as{' '}
                    <code className="font-mono bg-surface-100 px-1 py-0.5 rounded text-[10px]">
                      Total Duration / Executed Tests
                    </code>
                    . It represents the mean time required to complete a single test case in that
                    project profile.
                  </li>
                  <li>
                    <strong className="text-warning-600 dark:text-warning-500">
                      P95 Duration / Latency (s):
                    </strong>{' '}
                    Represents the 95th percentile completion threshold.{' '}
                    <strong>
                      95% of all executed tests in that project completed faster than this duration
                    </strong>
                    , while only 5% took longer.
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
                  Why P95 Latency is Critical for QA & CI Pipelines:
                </h5>
                <p className="mb-1.5">
                  Average duration can be deceptive—a large number of fast 100ms API checks will
                  drag the average down, masking extremely slow 15-second E2E user flows.
                </p>
                <p className="mb-1.5">
                  P95 isolates tail latency. High P95 latency exposes tests that suffer from:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Unnecessary explicit sleep/timeout delays</li>
                  <li>Heavy DOM re-rendering or unoptimized navigation</li>
                  <li>CI worker CPU/RAM throttling on specific browser engines</li>
                  <li>Slow background API network dependencies</li>
                </ul>
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
