import type { FailedTest } from '@/lib/utils';
import TestCaseCard from '../suites/TestCaseCard';

interface Props {
  failedTests: FailedTest[];
}

export default function FailureList({ failedTests }: Props) {
  if (failedTests.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-success-50 dark:bg-success-50/20 px-6 py-8 text-center">
        <svg
          className="h-8 w-8 text-success-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-left">
          <p className="text-sm font-semibold text-success-600 dark:text-success-500">
            No failures
          </p>
          <p className="text-xs text-text-body-mid dark:text-text-muted">
            All tests passed successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {failedTests.map((test, idx) => (
        <TestCaseCard key={idx} testCase={test.testCase} showSteps={false} />
      ))}
    </div>
  );
}
