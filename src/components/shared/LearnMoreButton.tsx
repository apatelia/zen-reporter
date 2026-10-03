export interface LearnMoreButtonProps {
  onClick: () => void;
  label?: string;
  title?: string;
  className?: string;
}

export default function LearnMoreButton({
  onClick,
  label = 'Learn more',
  title = 'Learn more about this section',
  className = '',
}: LearnMoreButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 rounded border border-border-default bg-surface-100 px-2 py-0.5 text-xs font-semibold text-accent-blue hover:bg-surface-200 transition-colors cursor-pointer shrink-0 ${className}`}
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
