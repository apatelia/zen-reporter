import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  BarShapeProps,
  LabelListEntry,
  TooltipValueType,
  TooltipPayloadEntry,
} from 'recharts';
import type { ReactElement, ReactNode } from 'react';
import type { ProjectStats } from '@arpanp/zen-core';
import { formatDurationVerbose } from '@arpanp/zen-core';
import LearnMoreButton from '@/components/shared/LearnMoreButton';

export interface ProjectLatencySpreadChartProps {
  projectStats: ProjectStats[];
  title?: string;
  className?: string;
  onOpenGuide?: () => void;
}

interface ChartDataItem {
  name: string;
  avgLog: number;
  tailLog: number;
  avgRawMs: number;
  p95RawMs: number;
  ratio: number | null;
}

const LOG_FLOOR_MS = 1;

/**
 * Converts a duration in milliseconds to its log10 position on the chart axis,
 * floored at 1 ms so zero/near-zero durations stay finite.
 * @param ms - Duration in milliseconds.
 * @returns Log10 of the duration (1 ms floor).
 */
const toLog = (ms: number): number => Math.log10(Math.max(ms, LOG_FLOOR_MS));

/**
 * Builds chart rows from project stats: typical (avg) and tail (P95 - avg) segments
 * as log10 values for the logarithmic x-axis, with the P95/avg ratio, sorted worst tail first.
 * @param projectStats - Per-project statistics containing avg and P95 durations in ms.
 * @returns Chart data rows sorted by tail ratio descending (no-ratio rows last).
 */
const buildChartData = (projectStats: ProjectStats[]): ChartDataItem[] =>
  projectStats
    .map((p) => {
      const avgLog = toLog(p.avgDuration);
      const p95Log = toLog(p.p95Duration);
      return {
        name: p.name,
        avgLog,
        tailLog: Math.max(0, p95Log - avgLog),
        avgRawMs: p.avgDuration,
        p95RawMs: p.p95Duration,
        ratio: p.avgDuration > 0 ? p.p95Duration / p.avgDuration : null,
      };
    })
    .sort((a, b) => {
      if (a.ratio === null && b.ratio === null) return 0;
      if (a.ratio === null) return 1;
      if (b.ratio === null) return -1;
      return b.ratio - a.ratio;
    });

const TAIL_CORNER_RADIUS = 4;
const TAIL_DOT_RADIUS = 4;

/**
 * Builds the SVG path for the tail segment with rounded right corners.
 * @param x - Left edge x of the segment.
 * @param y - Top edge y of the segment.
 * @param width - Segment width in px.
 * @param height - Segment height in px.
 * @returns SVG path data for the rounded-rect segment.
 */
const buildTailPath = (x: number, y: number, width: number, height: number): string => {
  const r = Math.min(TAIL_CORNER_RADIUS, width / 2, height / 2);
  return `M${x},${y} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r} V${y + height - r} A${r},${r} 0 0 1 ${x + width - r},${y + height} H${x} Z`;
};

/**
 * Custom shape for the P95 tail bar: the yellow tail segment with a dot marking
 * the typical (avg) duration at its left edge.
 * @param props - Recharts bar shape props (x, y, width, height of the stacked segment).
 * @returns SVG element rendering the tail segment and the avg marker dot.
 */
const TailBarShape = (props: BarShapeProps): ReactElement => {
  const x = Number(props.x);
  const y = Number(props.y);
  const width = Number(props.width);
  const height = Number(props.height);
  const cy = y + height / 2;
  return (
    <g>
      {width >= 1 && (
        <path d={buildTailPath(x, y, width, height)} fill="var(--color-accent-house)" />
      )}
      <circle
        cx={x}
        cy={cy}
        r={TAIL_DOT_RADIUS}
        fill="var(--color-surface-50)"
        stroke="var(--color-text-ink)"
        strokeWidth={1.5}
      />
    </g>
  );
};

/**
 * Builds the bar-end label text: the formatted P95 duration plus the tail multiplier (P95 / avg).
 * @param entry - Label list entry whose payload is the chart data item.
 * @returns Label text rendered at the end of the P95 bar.
 */
const TailValueAccessor = (entry: LabelListEntry): string => {
  const item = entry.payload as ChartDataItem;
  const ratioText = item.ratio !== null ? ` (${item.ratio.toFixed(1)}x)` : '';
  return `${formatDurationVerbose(item.p95RawMs)}${ratioText}`;
};

/**
 * Builds x-axis tick positions as log10 values, one per decade
 * (1 ms, 10 ms, 100 ms, 1 s, 10 s, ...).
 * @param maxMs - Maximum P95 duration in milliseconds.
 * @returns Tick positions as log10 values.
 */
const buildLogTicks = (maxMs: number): number[] => {
  const ticks: number[] = [];
  const maxExp = Math.floor(Math.log10(maxMs));
  for (let exp = 0; exp <= maxExp; exp += 1) {
    ticks.push(exp);
  }
  if (ticks.length === 0) ticks.push(0);
  return ticks;
};

/**
 * Formats a log10 axis tick value back to a human-readable duration.
 * @param value - Tick position as a log10 value.
 * @returns Formatted duration for the tick.
 */
const formatXTick = (value: number): string => formatDurationVerbose(10 ** Number(value));

/**
 * Formats a tooltip row for the latency spread chart.
 * @param value - Raw bar value in seconds for this row.
 * @param name - Legend name of the bar this row belongs to.
 * @param item - Tooltip payload entry carrying the chart data item.
 * @returns A [displayValue, rowName] tuple for the tooltip row.
 */
const DurationTooltipFormatter = (
  value: TooltipValueType | undefined,
  name: string | number | undefined,
  item: TooltipPayloadEntry
): [ReactNode, string] => {
  const payload = item.payload as ChartDataItem;
  if (name === 'Typical (avg)') {
    return [formatDurationVerbose(payload.avgRawMs), 'Typical (avg)'];
  }
  if (name === 'P95 tail (P95 - avg)') {
    const ratioText = payload.ratio !== null ? ` (${payload.ratio.toFixed(1)}x typical)` : '';
    return [`${formatDurationVerbose(payload.p95RawMs)}${ratioText}`, 'P95 (slow 5%)'];
  }
  return [`${String(value ?? 0)}s`, String(name ?? '')];
};

/**
 * Renders a legend entry with theme-aware text color.
 * @param value - Legend entry label text.
 * @returns Inline legend text element.
 */
const LegendFormatter = (value: string): ReactElement => (
  <span
    className="inline-flex items-center align-middle"
    style={{ color: 'var(--color-text-ink)', fontSize: '12px', fontWeight: 500 }}
  >
    {value}
  </span>
);

/**
 * Per-project latency spread chart: the typical (avg) duration as the green base,
 * the P95 tail (P95 - avg) as the yellow segment with a dot at the typical duration.
 * Rows are sorted worst tail first, with the P95 value and tail multiplier labeled
 * at each bar end so the tail severity reads at a glance.
 * @param projectStats - Per-project statistics with avg and P95 durations in ms.
 * @param title - Section heading for the chart.
 * @param className - Container class overrides from the parent section.
 * @param onOpenGuide - Opens the chart's Learn More guide modal when provided.
 * @returns The rendered chart section.
 */
export default function ProjectLatencySpreadChart({
  projectStats,
  title = 'Duration Spread & P95 Latency by Project',
  className = 'rounded-md bg-canvas border border-border-default px-6 py-6 shadow-sm flex flex-col justify-between',
  onOpenGuide,
}: ProjectLatencySpreadChartProps): ReactElement {
  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const data = buildChartData(projectStats);

  const hasDurationData =
    projectStats.length > 0 && data.some((d) => d.avgRawMs > 0 || d.p95RawMs > 0);

  /**
   * Aligns the longest project name one space away from the axis.
   * @param val - Project name tick value.
   * @returns Tick text with a leading non-breaking space for the longest name.
   */
  const formatYTick = (val: string): string =>
    val.length === maxLen && maxLen > 0 ? `\u00A0${val}` : val;

  const maxP95Ms = data.reduce((max, d) => Math.max(max, d.p95RawMs), 0);
  const domainMax = Math.max(Math.log10(Math.max(maxP95Ms, 1)), 0.3) + 0.6;
  const xTicks = buildLogTicks(Math.max(maxP95Ms, 1));

  return (
    <div className={className}>
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">{title}</h3>
          {onOpenGuide && <LearnMoreButton onClick={onOpenGuide} />}
        </div>
        <p className="mt-0.5 text-xs text-text-body-mid dark:text-text-muted">
          How much slower is the slowest 5% of tests than a typical test, per project (x-axis is
          logarithmic)
        </p>
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
            No execution duration data available for current run
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
              domain={[0, domainMax]}
              ticks={xTicks}
              tickFormatter={formatXTick}
            />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={12}
              width={yAxisWidth}
              tick={{ fill: 'var(--color-text-muted)' }}
              tickFormatter={formatYTick}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '6px',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-canvas)',
                color: 'var(--color-text-ink)',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              formatter={DurationTooltipFormatter}
            />
            <Legend
              iconType="circle"
              formatter={LegendFormatter}
              wrapperStyle={{ fontSize: '12px', fontWeight: '500', paddingBottom: '10px' }}
            />
            <Bar
              dataKey="avgLog"
              name="Typical (avg)"
              stackId="dur"
              fill="var(--color-accent-green)"
              radius={[4, 0, 0, 4]}
            />
            <Bar
              dataKey="tailLog"
              name="P95 tail (P95 - avg)"
              stackId="dur"
              fill="var(--color-accent-house)"
              shape={TailBarShape}
            >
              <LabelList
                position="right"
                offset={6}
                fontSize={12}
                fontWeight={600}
                fill="var(--color-text-ink)"
                valueAccessor={TailValueAccessor}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
