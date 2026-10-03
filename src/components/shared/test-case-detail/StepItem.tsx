import { useState } from 'react';
import type { TestStep } from '@/lib/types/report';
import { getStepCodeSnippet, highlightCodeSnippet } from '@/lib/codeHighlighting';
import { statusConfig } from './AttemptView';

export interface StepItemProps {
  step: TestStep;
  idx: number;
}

export function StepItem({ step, idx }: StepItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const snippetContent = step.snippet || getStepCodeSnippet(step.location);

  return (
    <div className="rounded-md border border-border-default bg-white dark:bg-surface-100/40 p-2.5 text-sm shadow-xs transition-all">
      <div
        className="flex items-center justify-between gap-2.5 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${statusConfig[step.status].bg} text-xs font-bold`}
          >
            {idx + 1}
          </span>
          <p className={`font-medium text-sm truncate ${statusConfig[step.status].text}`}>
            {step.title}
          </p>
          {step.params && Object.keys(step.params).length > 0 && (
            <span className="text-xs text-text-body-mid dark:text-text-muted truncate font-normal">
              {Object.values(step.params)
                .map((val) => (typeof val === 'object' ? JSON.stringify(val) : String(val)))
                .join(', ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-body-mid dark:text-text-muted tabular-nums font-medium">
            {step.duration}ms
          </span>
          <button
            type="button"
            className="rounded p-0.5 text-text-body-mid hover:bg-surface-100 dark:hover:bg-surface-200/50 hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors"
            title={isExpanded ? 'Hide details' : 'Show details'}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-border-default/60 dark:border-border-default/40">
          {/* Step Code Snippet with Syntax Highlighting */}
          {snippetContent ? (
            <div className="mt-1 mb-1.5">
              <div
                className="rounded-md bg-surface-100 dark:bg-surface-950 text-text-ink dark:text-slate-200 p-2.5 border border-border-default dark:border-border-subtle overflow-x-auto shadow-xs"
                /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                dangerouslySetInnerHTML={{
                  __html: highlightCodeSnippet(snippetContent, step.status),
                }}
              />
            </div>
          ) : (
            (!step.subSteps || step.subSteps.length === 0) &&
            (!step.annotations || step.annotations.length === 0) && (
              <div className="mt-1 mb-1.5 px-2.5 py-2 text-xs italic text-text-body-mid/70 dark:text-text-muted/60 bg-surface-100/50 dark:bg-surface-200/20 rounded border border-dashed border-border-default/60 dark:border-border-default/40">
                No code snippet available for this step.
              </div>
            )
          )}

          {/* Step Annotations */}
          {step.annotations && step.annotations.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {step.annotations.map((anno) => (
                <span
                  key={`step-anno-${anno.type}-${anno.description || ''}`}
                  className="inline-flex items-center rounded bg-surface-100 dark:bg-surface-200/30 px-2 py-0.5 text-[11px] text-text-body-mid"
                >
                  <span className="font-semibold mr-1">{anno.type}:</span>
                  {anno.description || 'N/A'}
                </span>
              ))}
            </div>
          )}

          {/* Step Sub-steps */}
          {step.subSteps && step.subSteps.length > 0 && (
            <div className="mt-1.5 ml-2 border-l-2 border-border-default dark:border-border-default pl-2 space-y-2">
              {step.subSteps.map((sub) => {
                const subSnippet = sub.snippet || getStepCodeSnippet(sub.location);
                return (
                  <div key={`sub-${sub.title}-${sub.duration}-${sub.location?.line || ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-text-body-mid dark:text-text-muted font-medium">
                        ↳ {sub.title}
                      </p>
                      <span className="text-[11px] text-text-body-mid/70 dark:text-text-muted/70 tabular-nums font-medium">
                        {sub.duration}ms
                      </span>
                    </div>
                    {subSnippet && (
                      <div className="mt-1 ml-3">
                        <div
                          className="rounded-md bg-surface-100 dark:bg-surface-950 text-text-ink dark:text-slate-200 p-2 border border-border-default dark:border-border-subtle overflow-x-auto shadow-xs"
                          /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                          dangerouslySetInnerHTML={{
                            __html: highlightCodeSnippet(subSnippet, sub.status),
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
