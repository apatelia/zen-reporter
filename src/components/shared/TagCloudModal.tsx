import { useEffect, useMemo, useState } from 'react';
import SearchInput from './SearchInput';

export interface TagCloudOption {
  tag: string;
  count: number;
}

interface TagCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagsWithCounts: TagCloudOption[];
  selectedTags: string[];
  onApply: (tags: string[]) => void;
  title?: string;
}

export default function TagCloudModal({
  isOpen,
  onClose,
  tagsWithCounts,
  selectedTags,
  onApply,
  title = 'Filter by Tags',
}: TagCloudModalProps) {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [tempSelection, setTempSelection] = useState<string[]>(selectedTags);
  const [searchTerm, setSearchTerm] = useState('');

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setTempSelection([...selectedTags]);
      setSearchTerm('');
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sortedTags = useMemo(() => {
    return [...tagsWithCounts].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });
  }, [tagsWithCounts]);

  const filteredTags = useMemo(() => {
    if (!searchTerm.trim()) return sortedTags;
    const query = searchTerm.trim().toLowerCase();
    return sortedTags.filter((t) => t.tag.toLowerCase().includes(query));
  }, [sortedTags, searchTerm]);

  const toggleTag = (tag: string) => {
    setTempSelection((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectAll = () => {
    setTempSelection(filteredTags.map((t) => t.tag));
  };

  const handleClear = () => {
    setTempSelection([]);
  };

  const handleApply = () => {
    onApply(tempSelection);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl rounded-lg border border-border-default bg-canvas p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border-default pb-3">
          <div>
            <h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">{title}</h3>
            <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
              Select one or more tags to filter test execution results ({tagsWithCounts.length}{' '}
              available tags)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors cursor-pointer"
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

        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search tags..."
            className="w-full sm:w-64"
            inputClassName="w-full rounded-md border border-border-default bg-surface-50 pl-9 pr-7 py-1.5 text-xs text-text-ink placeholder:text-text-muted focus:border-accent-blue focus:outline-none dark:bg-surface-50 dark:text-text-on-primary"
          />
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-md border border-border-default bg-surface-100 px-2.5 py-1 text-xs font-semibold text-text-body-mid hover:border-accent-blue hover:text-accent-blue transition-colors cursor-pointer"
            >
              Select All ({filteredTags.length})
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-border-default bg-surface-100 px-2.5 py-1 text-xs font-semibold text-text-body-mid hover:border-danger hover:text-danger transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Tag Cloud List */}
        <div className="flex-1 overflow-y-auto min-h-48 max-h-80 p-2 rounded-md border border-border-default bg-surface-50/50">
          {filteredTags.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs text-text-muted">
              No matching tags found
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map(({ tag, count }) => {
                const isSelected = tempSelection.includes(tag);
                const cleanTag = tag.replace(/^@/, '');
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent-blue text-text-on-primary font-bold shadow-xs ring-2 ring-accent-blue/30'
                        : 'border border-border-default bg-surface-100 text-text-body-mid hover:border-accent-blue/60 hover:text-text-ink dark:bg-surface-100 dark:hover:bg-surface-200/40'
                    }`}
                  >
                    <span>@{cleanTag}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected
                          ? 'bg-white/20 text-text-on-primary'
                          : 'bg-surface-200/60 text-text-muted dark:bg-surface-200/40'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border-default pt-3">
          <span className="text-xs text-text-muted font-medium">
            {tempSelection.length} tag(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-surface-100 px-4 py-1.5 text-xs font-semibold text-text-body-mid hover:bg-surface-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-accent-blue px-4 py-1.5 text-xs font-bold text-text-on-primary hover:bg-accent-blue/90 transition-colors cursor-pointer shadow-xs"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
