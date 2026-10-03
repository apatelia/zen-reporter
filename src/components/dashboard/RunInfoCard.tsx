export interface RunInfoCardProps {
  label: string;
  value: string | number;
  barColorClass?: string;
}

export default function RunInfoCard({
  label,
  value,
  barColorClass = 'bg-accent-blue',
}: RunInfoCardProps) {
  return (
    <div className="rounded-md bg-canvas border border-border-default shadow-sm overflow-hidden">
      <div className={`h-1 ${barColorClass}`} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {label}
          </span>
        </div>
        <span className="text-2xl font-bold text-text-ink dark:text-text-on-primary">{value}</span>
      </div>
    </div>
  );
}
