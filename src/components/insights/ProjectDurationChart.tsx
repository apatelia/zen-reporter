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
import type { ProjectStats } from '@/lib/statsUtils';
import { formatDuration } from '@/lib/formatters';
import LearnMoreButton from '@/components/shared/LearnMoreButton';

export interface ProjectDurationChartProps {
  projectStats: ProjectStats[];
  title?: string;
  className?: string;
  onOpenGuide?: () => void;
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
  onOpenGuide,
}: ProjectDurationChartProps) {
  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const toSeconds = (ms: number) => {
    if (!ms || ms <= 0) return 0;
    const sec = ms / 1000;
    return sec < 0.01 ? Number(sec.toFixed(3)) || 0.01 : Math.round(sec * 100) / 100;
  };

  const data: ChartDataItem[] = projectStats.map((p) => ({
    name: p.name,
    'Avg Duration (s)': toSeconds(p.avgDuration),
    'P95 Duration (s)': toSeconds(p.p95Duration),
    avgRawMs: p.avgDuration,
    p95RawMs: p.p95Duration,
    totalRawMs: p.totalDuration,
  }));

  const hasDurationData =
    projectStats.length > 0 &&
    data.some((d) => d['Avg Duration (s)'] > 0 || d['P95 Duration (s)'] > 0);

  return (
    <div className={className}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text-ink dark:text-text-on-primary">{title}</h3>
          <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
            Average vs P95 execution duration per test case across projects
          </p>
        </div>

        {onOpenGuide && <LearnMoreButton onClick={onOpenGuide} />}
      </div>

      {!hasDurationData ? (
        <div className="flex h-75 flex-col items-center justify-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6 text-center">
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
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-ink dark:text-text-on-primary">
            No execution duration data available
          </p>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            Execution timing benchmarks will be displayed once test cases report execution timing.
          </p>
        </div>
      ) : (
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
            <XAxis
              type="number"
              fontSize={12}
              tick={{ fill: 'var(--color-text-muted)' }}
              unit="s"
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
            <Bar
              dataKey="Avg Duration (s)"
              fill="var(--color-accent-green)"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="P95 Duration (s)"
              fill="var(--color-accent-house)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
