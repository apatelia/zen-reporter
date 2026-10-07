import type { TestSuite } from '@/lib/types/report';
import FileSummary from '@/components/files/FileSummary';
import FileMetricsSection from '@/components/files/FileMetricsSection';

export interface FilesSectionProps {
  suites: TestSuite[];
  isMinimalReport?: boolean;
}

export default function FilesSection({ suites, isMinimalReport }: FilesSectionProps) {
  if (suites.length === 0) {
    return (
      <div className="w-full space-y-6">
        <h1 className="sr-only">Files</h1>
        <FileMetricsSection suites={suites} isMinimalReport={isMinimalReport} />
        <div className="flex flex-col items-center justify-center py-10 px-6 rounded-md border border-dashed border-border-default bg-surface-100/50 text-center space-y-1.5">
          <p className="text-xs font-semibold text-text-ink dark:text-text-on-primary">
            No file data available for current run
          </p>
          <p className="text-[11px] text-text-body-mid dark:text-text-muted">
            No test cases were executed or matched the criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <h1 className="sr-only">Files</h1>

      <FileMetricsSection suites={suites} isMinimalReport={isMinimalReport} />

      <FileSummary suites={suites} title="Test Results by File" />
    </div>
  );
}
