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
      <h1 className="sr-only">Files</h1>

      <FileMetricsSection suites={suites} isMinimalReport={isMinimalReport} />

      <FileSummary suites={suites} title="Test Results by File" />
    </div>
  );
}
