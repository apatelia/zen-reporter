import React from 'react';

export type ViewMode = 'slider' | 'side-by-side' | 'diff' | 'onion';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  hasDiffImage: boolean;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  mode,
  onModeChange,
  hasDiffImage,
}) => {
  const modes: { id: ViewMode; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    {
      id: 'slider',
      label: 'Slider',
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 12h8M8 17h8M12 3v18" />
        </svg>
      ),
    },
    {
      id: 'side-by-side',
      label: '2-Up',
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 4.5v15m6-15v15m-12-15h18v15H3v-15z"
          />
        </svg>
      ),
    },
    {
      id: 'diff',
      label: 'Diff Overlay',
      disabled: false,
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      id: 'onion',
      label: 'Onion Skin',
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="inline-flex items-center rounded-md border border-border-default bg-surface-100 p-0.5 text-xs font-semibold shrink-0">
      {modes.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={m.disabled}
            onClick={() => onModeChange(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              active
                ? 'bg-canvas text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                : 'text-text-body-mid hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary font-medium'
            } ${m.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            title={m.id === 'diff' && !hasDiffImage ? 'Uses CSS difference blend mode' : m.label}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
