import { useMemo, useState, useRef, useEffect, ReactNode } from 'react';

interface MultiSelectFilterProps<T> {
  label: string;
  options: T[];
  selectedOptions: T[];
  onApply: (options: T[]) => void;
  icon?: ReactNode;
  getDisplayValue: (options: T[]) => string;
  renderOption?: (option: T, isSelected: boolean, handleToggle: (option: T) => void) => ReactNode;
  showSearch?: boolean;
}

export default function MultiSelectFilter<T extends string>({
  label,
  options,
  selectedOptions,
  onApply,
  icon,
  getDisplayValue,
  renderOption,
  showSearch = false,
}: MultiSelectFilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelection, setTempSelection] = useState<T[]>([...selectedOptions]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTempSelection([...selectedOptions]);
  }, [selectedOptions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(
    () => options.filter((option) => option.toLowerCase().includes(searchTerm.toLowerCase())),
    [options, searchTerm]
  );

  const handleToggle = (option: T) => {
    setTempSelection((prev) =>
      prev.includes(option) ? prev.filter((s) => s !== option) : [...prev, option]
    );
  };

  const handleSelectAll = () => {
    setTempSelection([...(filteredOptions.length > 0 ? filteredOptions : options)]);
  };

  const handleClear = () => {
    setTempSelection([]);
  };

  const handleApply = () => {
    onApply(tempSelection);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const selectionLabel = getDisplayValue(selectedOptions);
  const filterCount =
    options.length > 0
      ? selectedOptions.length === 0
        ? options.length
        : selectedOptions.length
      : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            setTempSelection(selectedOptions.length > 0 ? [...selectedOptions] : [...options]);
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-border-default bg-surface-100 px-3 py-1.5 text-xs font-medium text-text-body-mid transition-all duration-200 hover:border-border-default hover:text-text-ink dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-border-default dark:hover:text-text-on-primary"
        >
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate max-w-37.5">{selectionLabel}</span>
          {filterCount !== 0 && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent-blue text-[10px] font-bold text-text-on-primary dark:bg-accent-blue/80">
              {filterCount}
            </span>
          )}
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 z-50 mt-1 min-w-62.5 overflow-hidden rounded-md border border-border-default bg-canvas shadow-2xl ring-1 ring-black/5 dark:border-border-default dark:bg-canvas dark:ring-white/10">
            <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
              {showSearch && (
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search options..."
                    className="w-full rounded-md border border-border-default bg-surface-50 py-1.5 pl-8 pr-8 text-xs text-text-ink placeholder-text-muted-soft outline-none ring-accent-blue/30 transition-all focus:ring-2 dark:border-border-default dark:bg-surface-50 dark:text-text-on-primary dark:placeholder-text-muted"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted-soft hover:text-text-muted transition-colors"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              {filteredOptions.map((option) => {
                const isSelected = tempSelection.includes(option);
                return renderOption ? (
                  renderOption(option, isSelected, handleToggle)
                ) : (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleToggle(option)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-accent-blue/15 ring-1 ring-accent-blue/40 text-accent-blue dark:bg-accent-blue/25 dark:text-success-500 dark:ring-accent-blue/50'
                        : 'text-text-body-mid hover:bg-surface-50 dark:text-text-body-mid dark:hover:bg-surface-100 dark:hover:text-text-on-primary'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                        isSelected
                          ? 'border-accent-blue bg-accent-blue dark:border-success-500 dark:bg-success-500'
                          : 'border-border-default bg-surface-50 dark:border-border-default dark:bg-surface-50'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-2.5 w-2.5 text-text-on-primary dark:text-surface-950"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{option}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border-default bg-surface-50 p-2 dark:border-border-default dark:bg-surface-50">
              <button
                type="button"
                onClick={handleSelectAll}
                className="rounded-md border border-border-default bg-surface-100 px-2 py-1 text-[10px] font-medium text-text-body-mid transition-colors hover:border-accent-blue hover:bg-accent-blue/10 hover:text-accent-blue dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-accent-blue dark:hover:bg-accent-blue/10 dark:hover:text-accent-blue"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md border border-border-default bg-surface-100 px-2 py-1 text-[10px] font-medium text-text-body-mid transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-danger dark:hover:bg-danger/10 dark:hover:text-danger"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-md bg-accent-blue px-2.5 py-1 text-[10px] font-semibold text-text-on-primary shadow-sm transition-colors hover:bg-accent-blue/90"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
