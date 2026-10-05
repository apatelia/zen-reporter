import type { UniversalPreviewItem } from './UniversalPreviewModal';

export interface TestStdOutputProps {
  stdout?: string[];
  stderr?: string[];
  previewItems?: UniversalPreviewItem[];
  onOpenPreview?: (itemIndex: number) => void;
}

export function TestStdOutput({ stdout, stderr, previewItems, onOpenPreview }: TestStdOutputProps) {
  const hasStdout = stdout && stdout.length > 0;
  const hasStderr = stderr && stderr.length > 0;

  if (!hasStdout && !hasStderr) return null;

  const handleOpenLog = (type: 'stdout' | 'stderr') => {
    if (previewItems && onOpenPreview) {
      const idx = previewItems.findIndex((item) => item.id === type);
      if (idx !== -1) {
        onOpenPreview(idx);
      }
    }
  };

  const renderLogSection = (
    type: 'stdout' | 'stderr',
    lines: string[],
    title: string,
    badgeClasses: string,
    bgClasses: string,
    textClasses: string,
    borderClasses: string
  ) => {
    const isLong = lines.length > 3;
    const previewLines = isLong ? lines.slice(0, 2) : lines;

    return (
      <div className="mb-4">
        {/* Header Strip */}
        <div className="flex items-center gap-2 mb-2">
          <h5 className={`text-xs font-bold uppercase tracking-wider ${badgeClasses}`}>{title}</h5>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface-200 dark:bg-surface-200/50 text-text-body-mid">
            {isLong
              ? `showing 2 of ${lines.length} lines`
              : `${lines.length} ${lines.length === 1 ? 'line' : 'lines'}`}
          </span>
        </div>

        {/* Code Snippet Box */}
        <div className={`rounded-md ${bgClasses} ${borderClasses} border overflow-hidden`}>
          <pre className={`p-3 text-xs font-mono leading-relaxed ${textClasses} overflow-x-auto`}>
            {previewLines.join('\n')}
          </pre>
        </div>

        {/* View Full Log Link below code snippet box */}
        {isLong && (
          <div className="mt-1.5 flex justify-start">
            <button
              type="button"
              onClick={() => handleOpenLog(type)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-blue hover:text-accent-blue/80 hover:underline cursor-pointer"
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              View Full Log ({lines.length} lines)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {hasStdout &&
        renderLogSection(
          'stdout',
          stdout,
          'Standard Output (stdout)',
          'text-text-body-mid dark:text-text-muted',
          'bg-surface-100 dark:bg-surface-950',
          'text-text-ink dark:text-slate-200',
          'border-border-default dark:border-border-subtle'
        )}

      {hasStderr &&
        renderLogSection(
          'stderr',
          stderr,
          'Standard Error (stderr)',
          'text-text-body-mid dark:text-danger-500',
          'bg-danger-50 dark:bg-surface-950',
          'text-danger-700 dark:text-danger-400',
          'border-danger-200 dark:border-danger-900/50'
        )}
    </>
  );
}
