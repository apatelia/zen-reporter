import GuideModal from '@/components/shared/GuideModal';
import { STEP_CATEGORIES } from '@/lib/stepCategoryClassifier';

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
        subtitle="Metric definitions, targets, and diagnostic guidelines for Zen Reporter"
      >
        <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
          {/* Overview */}
          <div>
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-1">
              Overview
            </h4>
            <p>
              The <strong>Pass Rate Trend</strong> chart tracks overall test pass percentage across
              historical execution runs stored in Zen Reporter, providing a long-term pulse on test
              suite stability and build quality.
            </p>
          </div>

          {/* Target Thresholds */}
          <div className="space-y-2 border-t border-border-default pt-4">
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-1">
              Quality Target Thresholds
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-success-600 dark:text-success-500">
                  ≥ 95% Pass Rate
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Target operational health for CI/CD production deployment pipelines.
                </p>
              </div>

              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-warning-600 dark:text-warning-500">
                  85% – 94% Pass Rate
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Elevated flakiness or minor regressions requiring suite maintenance.
                </p>
              </div>

              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-danger-600 dark:text-danger-500">
                  &lt; 85% Pass Rate
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Severe pipeline instability requiring immediate developer triage.
                </p>
              </div>
            </div>
          </div>

          {/* Why & How This Trend Chart Is Useful */}
          <div className="space-y-2 border-t border-border-default pt-4">
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-1">
              Why & How This Trend Is Useful
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-danger-600 dark:text-danger-400">
                  🚨 Triage & Regression Signal
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Sharp downward drops in pass rate pinpoint widespread software regressions, broken
                  API dependencies, or CI environment infrastructure outages.
                </p>
              </div>

              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-success-600 dark:text-success-500">
                  📈 Stability Slope Tracking
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Upward trend slopes demonstrate successful flaky test remediation, stabilized test
                  fixtures, and improved overall test harness reliability.
                </p>
              </div>

              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-accent-blue dark:text-accent-blue">
                  🛡️ Release Gatekeeper
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Provides engineering leads and QA managers with clear historical confidence
                  metrics before authorizing production release candidate deployments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </GuideModal>

      {/* 2. Duration Trend Guide Modal */}
      <GuideModal
        isOpen={durationModalOpen}
        onClose={onCloseDurationModal}
        title="Project Duration Trend Guide"
        subtitle="Historical run duration trends and sequential effort diagnostics across projects"
      >
        <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
          {/* Overview */}
          <div>
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-1">
              Overview & Diagnostic Utility
            </h4>
            <p>
              The <strong>Project Duration Trend</strong> chart plots execution run times across
              historical test runs for each project, helping engineering teams spot performance
              drift, suite bloat, and execution bottlenecks over time.
            </p>
          </div>

          {/* Sequential Effort Explanation Note */}
          <div className="rounded-md border border-border-default bg-surface-100/50 p-3.5 space-y-1.5 dark:bg-surface-200/20">
            <h5 className="font-bold text-xs text-text-ink dark:text-text-on-primary flex items-center gap-1.5">
              <span>💡</span> Sequential Effort vs. Wall-Clock Duration
            </h5>
            <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
              Each trend line tracks total <strong>sequential effort</strong> — calculated as the
              sum of all individual test durations within that project — rather than total
              wall-clock elapsed time.
            </p>
            <p className="text-[11px] text-text-body-mid/90 dark:text-text-muted/90 leading-relaxed">
              <strong>Why this matters:</strong> In parallelized test runs, the cumulative
              sequential effort of a busy project can be significantly higher than the actual
              wall-clock execution time. To analyze concurrency gains and worker efficiency, check
              the <em>Execution Efficiency</em> metrics on the dashboard.
            </p>
          </div>

          {/* Diagnostic Action Items */}
          <div className="space-y-2 border-t border-border-default pt-4">
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-1">
              How to Use This Diagnostic Trend
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-warning-600 dark:text-warning-500">
                  📈 Upward Duration Spikes
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Indicates newly added heavy setup hooks, lengthy tests, unoptimized API calls, or
                  slow database migrations added in recent commits.
                </p>
              </div>

              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-accent-blue dark:text-accent-blue">
                  ⚖️ Suite Workload Balancing
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Spots slow projects holding back the entire test run, showing you where to split
                  tests or move workers to get faster feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </GuideModal>

      {/* 3. Step Category Composition Guide Modal */}
      <GuideModal
        isOpen={stepCategoryModalOpen}
        onClose={onCloseStepCategoryModal}
        title="Step Category Composition & Trend Guide"
      >
        <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted">
          <div>
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-1">
              Overview
            </h4>
            <p>
              This chart categorizes and tracks every automated step executed in your Playwright
              test runs, revealing the architectural composition of your test suite over time.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-2">
              Step Categories
            </h4>
            <div className="space-y-3">
              {STEP_CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="p-2.5 rounded-md border border-border-default bg-surface-100/50 dark:bg-surface-200/20"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold text-xs text-text-ink dark:text-text-on-primary">
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-body-mid dark:text-text-muted">
                    {cat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* View Modes Explanation */}
          <div className="space-y-2 border-t border-border-default pt-4">
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-1">
              View Modes (% Normalized vs. Step Count)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-text-ink dark:text-text-on-primary">
                  % Normalized View
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Displays the relative percentage (0%–100%) contribution of each step category for
                  every run. This normalizes for changes in test suite size so you can compare
                  relative test composition over time.
                </p>
              </div>
              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-text-ink dark:text-text-on-primary">
                  Step Count View
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Displays the absolute number of steps executed per category in each run. This
                  helps track total step volume expansion and absolute execution scale across test
                  runs.
                </p>
              </div>
            </div>
          </div>

          {/* Why & How This Trend Chart Is Useful */}
          <div className="space-y-2 border-t border-border-default pt-4">
            <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary mb-1">
              Why & How This Trend Chart Is Useful
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-warning-600 dark:text-warning-500">
                  ⚡ Flakiness & Overhead
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Spikes in <strong>Explicit Waits</strong> steps highlight dynamic wait patching or
                  flaky test practices.
                </p>
              </div>
              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-success-600 dark:text-success-500">
                  🎯 Assertion Rigor
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Tracks whether new tests validate application state or spend excessive time
                  navigating without assertion density.
                </p>
              </div>
              <div className="rounded-md border border-border-default bg-surface-100/50 p-3 space-y-1 dark:bg-surface-200/20">
                <span className="font-bold text-xs text-text-ink dark:text-text-on-primary">
                  🛠️ Fixture Maintenance
                </span>
                <p className="text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                  Ensures setup hooks (`beforeEach`, auth setup) remain lightweight over time
                  without consuming runtime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </GuideModal>
    </>
  );
}
