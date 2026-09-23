import React from 'react';
import GuideModal from '@/components/shared/GuideModal';

interface TrendsGuidesProps {
  passRateModalOpen: boolean;
  onClosePassRateModal: () => void;
  durationModalOpen: boolean;
  onCloseDurationModal: () => void;
  stepCategoryModalOpen: boolean;
  onCloseStepCategoryModal: () => void;
}

export default function TrendsGuides({
  passRateModalOpen,
  onClosePassRateModal,
  durationModalOpen,
  onCloseDurationModal,
  stepCategoryModalOpen,
  onCloseStepCategoryModal,
}: TrendsGuidesProps) {
  return (
    <>
      {/* 1. Pass Rate Trend Guide Modal */}
      <GuideModal
        isOpen={passRateModalOpen}
        onClose={onClosePassRateModal}
        title="Pass Rate Trend Guide"
        subtitle="Historical stability benchmarks and quality target guidelines"
      >
        <p>
          The <strong className="text-text-ink dark:text-text-on-primary">Pass Rate Trend</strong>{' '}
          chart tracks overall test pass percentage across historical execution runs stored in Zen
          Reporter.
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Quality Targets & Operational Guidelines:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Target Pass Rate:</strong> Aim for a consistent pass rate of ≥95% across CI/CD
              runs.
            </li>
            <li>
              <strong>Triage Drops:</strong> Sharp drops in pass rate indicate widespread regression
              or environment infrastructure failures.
            </li>
            <li>
              <strong>Long-Term Stability:</strong> Upward trend slopes reflect successful flaky
              test remediation and test suite stabilization.
            </li>
          </ul>
        </div>
      </GuideModal>

      {/* 2. Duration Trend Guide Modal */}
      <GuideModal
        isOpen={durationModalOpen}
        onClose={onCloseDurationModal}
        title="Duration Trend Guide"
        subtitle="Historical runtime performance and project execution benchmarks"
      >
        <p>
          The <strong className="text-text-ink dark:text-text-on-primary">Duration Trend</strong>{' '}
          chart visualizes wall-clock execution time (in seconds) across historical test runs,
          broken down by project profile.
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Performance Benchmarks & Insights:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Pipeline Efficiency:</strong> Monitor total execution time to ensure CI
              feedback loops stay fast.
            </li>
            <li>
              <strong>Duration Creep:</strong> Gradual increases in run duration indicate test bloat
              or unoptimized waits.
            </li>
            <li>
              <strong>Parallel Optimization:</strong> Compare durations between worker
              configurations to evaluate parallel scaling efficiency.
            </li>
          </ul>
        </div>
      </GuideModal>

      {/* 3. Step Category Composition Guide Modal */}
      <GuideModal
        isOpen={stepCategoryModalOpen}
        onClose={onCloseStepCategoryModal}
        title="Step Category Composition Guide"
        subtitle="Automated step type breakdown, ratio targets, and optimization strategy"
      >
        <p>
          The{' '}
          <strong className="text-text-ink dark:text-text-on-primary">
            Step Category Composition
          </strong>{' '}
          chart details the breakdown of test step execution types across historical runs
          (Assertions, Actions, Network activity, and Explicit Waits).
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Step Type Guidelines:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong className="text-success-600 dark:text-success-500">Assertions:</strong> High
              assertion density indicates strong test verification quality.
            </li>
            <li>
              <strong className="text-accent-blue dark:text-accent-blue">Actions:</strong> User
              interaction steps like clicks, fills, and navigation.
            </li>
            <li>
              <strong className="text-warning-600 dark:text-warning-500">Waits:</strong> High wait
              ratios suggest overuse of fixed delays; replace with web-first assertions.
            </li>
            <li>
              <strong className="text-purple-600 dark:text-purple-400">Network:</strong> API
              requests and network interception steps during execution.
            </li>
          </ul>
        </div>
      </GuideModal>
    </>
  );
}
