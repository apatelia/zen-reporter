import type { TestSuite } from '@/lib/types/report';
import FileSummary from '@/components/files/FileSummary';
import FileMetricsSection from '@/components/files/FileMetricsSection';

export interface FilesSectionProps {
  suites: TestSuite[];
  isMinimalReport?: boolean;
}

export default function FilesSection({ suites, isMinimalReport }: FilesSectionProps) {
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
          Files
        </h2>
        <p className="mt-1 text-sm text-text-body-mid dark:text-text-muted">
          Summary and breakdown of test execution by file.
        </p>
      </div>

      <FileMetricsSection suites={suites} isMinimalReport={isMinimalReport} />

      <FileSummary suites={suites} title="File Breakdown Summary" />
    </div>
  );
}
