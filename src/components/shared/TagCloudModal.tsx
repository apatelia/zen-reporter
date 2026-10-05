import { useEffect, useMemo, useState } from 'react';
import SearchInput from './SearchInput';
import BaseModal from './BaseModal';

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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={<h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">{title}</h3>}
      subtitle={`Select one or more tags to filter test execution results (${tagsWithCounts.length} available tags)`}
      maxWidthClass="max-w-xl"
      maxHeightClass="max-h-[85vh]"
      footerActions={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-text-muted font-medium">
            {tempSelection.length} tag(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-surface-100 px-4 py-1.5 text-xs font-semibold text-text-body-mid hover:bg-surface-200 hover:text-text-ink dark:hover:bg-surface-200/50 dark:hover:text-text-on-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-full bg-accent-blue px-4 py-1.5 text-xs font-bold text-text-on-primary dark:text-surface-950 hover:bg-accent-blue/90 transition-colors cursor-pointer shadow-xs"
            >
              Apply Filter
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search tags by tag name..."
            className="w-full sm:w-64"
          />
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-md border border-border-default bg-surface-100 px-2.5 py-1 text-xs font-semibold text-text-body-mid hover:border-accent-blue hover:text-accent-blue dark:hover:bg-surface-200/50 transition-colors cursor-pointer"
            >
              Select All ({filteredTags.length})
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-border-default bg-surface-100 px-2.5 py-1 text-xs font-semibold text-text-body-mid hover:border-danger hover:text-danger dark:hover:bg-surface-200/50 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Tag Cloud List */}
        <div className="overflow-y-auto min-h-48 max-h-80 p-2 rounded-md border border-border-default bg-surface-50/50">
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
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent-blue text-text-on-primary dark:text-surface-950 font-bold shadow-xs ring-2 ring-accent-blue/30'
                        : 'border border-border-default bg-surface-100 text-text-body-mid hover:border-accent-blue/60 hover:text-text-ink dark:bg-surface-100 dark:hover:bg-surface-200/40'
                    }`}
                  >
                    <span>@{cleanTag}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        isSelected
                          ? 'bg-black/20 text-text-on-primary dark:bg-surface-950/30 dark:text-surface-950 border border-black/10 dark:border-surface-950/20'
                          : 'bg-canvas text-text-ink dark:bg-surface-200 dark:text-text-on-primary border border-border-default shadow-2xs'
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
      </div>
    </BaseModal>
  );
}
