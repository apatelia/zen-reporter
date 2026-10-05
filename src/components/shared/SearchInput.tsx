import React from 'react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  onClear?: () => void;
  icon?: React.ReactNode;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = 'min-w-50 flex-1 sm:flex-none',
  inputClassName = 'h-9 w-full rounded-md border border-border-default bg-canvas pl-9 pr-7 text-xs text-text-ink placeholder:text-text-muted focus:border-accent-blue focus:outline-none disabled:opacity-50 dark:bg-canvas dark:text-text-on-primary transition-colors',
  disabled = false,
  onClear,
  icon,
}: SearchInputProps) {
  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
        {icon ?? (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        )}
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-ink dark:hover:text-text-on-primary disabled:opacity-50"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
