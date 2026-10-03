import { useState } from 'react';
import type { Attachment, TestCase } from '@/lib/types/report';
import { extractVisualDiffPairs } from '@/lib/cryptoUtils';
import { VisualDiffViewer } from '../visual-regression/VisualDiffViewer';
import { buildAttempts, collectAttemptAttachments } from './test-case-detail/AttemptView';
import { AttemptTabSelector } from './test-case-detail/AttemptTabSelector';
import { StepItem } from './test-case-detail/StepItem';
import { TestAttachments } from './test-case-detail/TestAttachments';
import { TestErrorAlert } from './test-case-detail/TestErrorAlert';
import { TestStdOutput } from './test-case-detail/TestStdOutput';

export interface TestCaseDetailProps {
  testCase: TestCase;
  showSteps?: boolean;
}

export default function TestCaseDetail({ testCase, showSteps = true }: TestCaseDetailProps) {
  const attempts = buildAttempts(testCase);
  const [activeAttemptIdx, setActiveAttemptIdx] = useState(attempts.length - 1);
  const activeAttempt = attempts[Math.max(0, Math.min(activeAttemptIdx, attempts.length - 1))];

  const caseAnnotations = testCase.annotations || [];
  const validAnnotations = caseAnnotations.filter(
    (anno) => anno.description && anno.description.trim().length > 0
  );

  const getAttachmentUrl = (att: Attachment): string | null => {
    if (att.body) {
      if (att.body.startsWith('data:')) {
        return att.body;
      }
      const mime = att.contentType || 'image/png';
      return `data:${mime};base64,${att.body}`;
    }
    if (att.path) {
      return att.path;
    }
    return null;
  };

  const attachments = collectAttemptAttachments(activeAttempt);
  const visualDiffPairs = extractVisualDiffPairs(attachments, getAttachmentUrl);

  const hasNoDetails =
    !activeAttempt.steps &&
    !activeAttempt.error &&
    attachments.length === 0 &&
    (!activeAttempt.stdout || activeAttempt.stdout.length === 0) &&
    (!activeAttempt.stderr || activeAttempt.stderr.length === 0);

  return (
    <>
      {/* Test Case Annotations & Description */}
      {validAnnotations.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Annotations & Description
          </h5>
          <div className="space-y-2">
            {validAnnotations.map((anno) => (
              <div
                key={`valid-anno-${anno.type}-${anno.description}`}
                className="rounded-md border border-border-default bg-canvas p-3 text-sm shadow-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded bg-surface-200 dark:bg-surface-200/50 px-2 py-0.5 text-xs font-semibold text-text-body-mid">
                    {anno.type}
                  </span>
                </div>
                <p className="text-text-ink dark:text-text-on-primary text-sm font-medium">
                  {anno.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attempt Retry Selector Tabs */}
      <AttemptTabSelector
        attempts={attempts}
        activeAttemptIdx={activeAttemptIdx}
        onSelectAttempt={setActiveAttemptIdx}
      />

      {/* Execution Steps */}
      {showSteps && activeAttempt.steps && activeAttempt.steps.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Execution Steps
          </h5>
          <div className="space-y-2">
            {activeAttempt.steps.map((step, idx) => (
              <StepItem
                key={`step-${step.title}-${step.duration}-${step.location?.line || ''}`}
                step={step}
                idx={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Direct Errors */}
      {activeAttempt.error && (
        <TestErrorAlert error={activeAttempt.error} status={activeAttempt.status} />
      )}

      {/* Visual Regression Diff Section */}
      {visualDiffPairs.length > 0 && (
        <div className="mb-4 space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Visual Regression Comparison
          </h5>
          {visualDiffPairs.map((pair, idx) => (
            <VisualDiffViewer key={`visual-diff-${pair.name || idx}`} pair={pair} />
          ))}
        </div>
      )}

      {/* Attachments */}
      <TestAttachments attachments={attachments} getAttachmentUrl={getAttachmentUrl} />

      {/* Standard Output (stdout & stderr) */}
      <TestStdOutput stdout={activeAttempt.stdout} stderr={activeAttempt.stderr} />

      {/* No Details Fallback */}
      {hasNoDetails && (
        <p className="text-sm text-text-body-mid dark:text-text-muted italic">
          {attempts.length > 1
            ? 'No detailed steps or errors recorded for this attempt.'
            : 'No detailed steps or errors recorded.'}
        </p>
      )}
    </>
  );
}
