interface Props {
  label: string;
  value: string | number;
  barColorClass?: string;
}

export default function RunInfoCard({ label, value, barColorClass = 'bg-accent-blue' }: Props) {
  return (
    <div className="rounded-md bg-canvas border border-border-default shadow-sm overflow-hidden">
      <div className={`h-1 ${barColorClass}`} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {label}
          </span>
        </div>
        <span className="text-3xl font-bold text-text-ink dark:text-text-on-primary">{value}</span>
      </div>
    </div>
  );
}
