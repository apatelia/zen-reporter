import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDateParts } from '@/lib/formatters';
import { STEP_CATEGORIES } from './stepCategoryClassifier';

export interface StepCategoryChartProps {
  chartData: Record<string, unknown>[];
  viewMode: 'percent' | 'count';
}

function parseTrendDateParts(valStr: string): [string, string] | null {
  if (!valStr || valStr === 'Current Run' || valStr.startsWith('Run')) {
    return null;
  }
  if (valStr.includes('T') || (valStr.includes('-') && /\d/.test(valStr))) {
    const timestamp = Date.parse(valStr);
    if (!isNaN(timestamp)) {
      return formatDateParts(valStr);
    }
  }
  return null;
}

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
  const valStr = String(payload.value);

  const dateParts = parseTrendDateParts(valStr);
  let dateLine = valStr;
  let timeLine = '';

  if (dateParts) {
    dateLine = dateParts[0] || valStr;
    timeLine = dateParts[1] || '';
  } else if (valStr.includes(' ')) {
    const spaceIdx = valStr.indexOf(' ');
    dateLine = valStr.substring(0, spaceIdx);
    timeLine = valStr.substring(spaceIdx + 1);
  }

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
      {timeLine ? (
        <text
          x={tickX}
          y={tickY + 24}
          textAnchor="middle"
          fontSize={11}
          fill="var(--color-text-body-mid)"
        >
          {timeLine}
        </text>
      ) : null}
    </g>
  );
};

const renderCategoryTooltip = (props: TooltipContentProps, viewMode: 'percent' | 'count') => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const valStr = String(label);
  const dateParts = parseTrendDateParts(valStr);
  let dateLine = valStr;
  let timeLine = '';
  if (dateParts) {
    dateLine = dateParts[0] || valStr;
    timeLine = dateParts[1] || '';
  }

  return (
    <div className="p-2.5 text-text-ink dark:text-text-on-primary">
      <div className="font-bold text-xs">{dateLine}</div>
      {timeLine && (
        <div className="text-[11px] text-text-body-mid dark:text-text-muted mb-1.5">{timeLine}</div>
      )}
      <div className="space-y-1 text-xs">
        {payload.map((entry) => {
          const val = Number(entry.value);
          const formattedVal = viewMode === 'percent' ? `${val}%` : `${val} steps`;
          const catConfig = STEP_CATEGORIES.find((c) => c.label === entry.name);
          const color = catConfig ? catConfig.color : entry.color;
          return (
            <div
              key={String(entry.name)}
              className="flex items-center justify-between gap-4 font-medium"
            >
              <span className="flex items-center gap-1.5 text-text-ink dark:text-text-on-primary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {entry.name}:
              </span>
              <span className="font-bold tabular-nums text-text-ink dark:text-text-on-primary">
                {formattedVal}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function StepCategoryChart({ chartData, viewMode }: StepCategoryChartProps) {
  return (
    <div className="h-72 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border-chart, #e5e7eb)"
          />
          <XAxis
            dataKey="name"
            tick={renderTrendTick}
            axisLine={{ stroke: 'var(--color-border-chart, #e5e7eb)' }}
            tickLine={false}
            height={45}
          />
          <YAxis
            domain={viewMode === 'percent' ? [0, 100] : [0, 'auto']}
            tickFormatter={(val) => (viewMode === 'percent' ? `${val}%` : `${val}`)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-text-body-mid)', fontSize: 11 }}
          />
          <Tooltip content={(props) => renderCategoryTooltip(props, viewMode)} />
          <Legend
            wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
            formatter={(value) => (
              <span className="text-text-body-mid dark:text-text-muted font-medium font-sans">
                {value}
              </span>
            )}
          />
          {STEP_CATEGORIES.map((cat) => (
            <Bar
              key={cat.key}
              dataKey={cat.label}
              stackId="a"
              fill={cat.color}
              stroke={cat.borderColor}
              strokeWidth={0.5}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
