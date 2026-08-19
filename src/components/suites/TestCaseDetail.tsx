import { useState } from 'react';
import type { Attachment, TestCase } from '@/lib/types';
import { parseAnsiToHtml } from '@/lib/utils';

interface Props {
  testCase: TestCase;
  showSteps?: boolean;
}

const statusConfig = {
  passed: {
    bg: 'bg-success-500 text-white dark:bg-success-500/20 dark:text-success-500',
    text: 'text-success-600 dark:text-success-500',
  },
  failed: {
    bg: 'bg-danger-500 text-white dark:bg-danger-500/20 dark:text-danger-500',
    text: 'text-danger-600 dark:text-danger-500',
  },
  skipped: {
    bg: 'bg-surface-200 text-text-body-mid dark:bg-surface-200/50 dark:text-text-body-mid',
    text: 'text-text-muted dark:text-text-muted',
  },
  timedOut: {
    bg: 'bg-warning-500 text-white dark:bg-warning-500/20 dark:text-warning-500',
    text: 'text-warning-600 dark:text-warning-500',
  },
};

export default function TestCaseDetail({ testCase, showSteps = true }: Props) {
  const [activeAttachment, setActiveAttachment] = useState<{
    name: string;
    url: string;
    type: 'image' | 'text';
    contentType?: string;
    content?: string;
  } | null>(null);

  // Collect annotations from test case
  const caseAnnotations = testCase.annotations || [];
  const validAnnotations = caseAnnotations.filter(
    (anno) => anno.description && anno.description.trim().length > 0
  );

  // Helper to determine image URL / preview suitability
  const getAttachmentUrl = (att: Attachment): string | null => {
    if (att.path) return att.path;
    if (att.body) {
      const base64 =
        typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('base64');
      const mime = att.contentType || 'application/octet-stream';
      return `data:${mime};base64,${base64}`;
    }
    return null;
  };

  const isImageAttachment = (att: Attachment): boolean => {
    return (
      (att.contentType && att.contentType.startsWith('image/')) ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || att.path || '')
    );
  };

  const isTextAttachment = (att: Attachment): boolean => {
    return (
      (att.contentType && att.contentType.startsWith('text/')) ||
      /\.(txt|log|json|csv|html|xml|md|yaml|yml|js|ts|jsx|tsx|css)$/i.test(att.name || att.path || '')
    );
  };

  const getTextContent = (att: Attachment): string => {
    if (att.body) {
      if (typeof att.body === 'string') {
        // If it's a base64 string or plain string
        try {
          return atob(att.body);
        } catch {
          return att.body;
        }
      }
      return Buffer.from(att.body).toString('utf-8');
    }
    return '';
  };

  // Helper to extract attachments from steps recursively and deduplicate
  const getAllAttachments = (tc: TestCase): Attachment[] => {
    const rawList: Attachment[] = [...(tc.attachments || [])];
    const collectFromSteps = (steps?: typeof tc.steps) => {
      if (!steps) return;
      for (const step of steps) {
        if (step.attachments && step.attachments.length > 0) {
          rawList.push(...step.attachments);
        }
        if (step.subSteps && step.subSteps.length > 0) {
          collectFromSteps(step.subSteps);
        }
      }
    };
    collectFromSteps(tc.steps);

    // Deduplicate by combination of name, path, and contentType
    const seen = new Set<string>();
    const deduplicated: Attachment[] = [];
    for (const att of rawList) {
      const key = `${att.name || ''}_${att.path || ''}_${att.contentType || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(att);
      }
    }
    return deduplicated;
  };

  const attachments = getAllAttachments(testCase);

  return (
    <>
      {/* Test Case Annotations Description */}
      {validAnnotations.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Annotations & Description
          </h5>
          <div className="space-y-2">
            {validAnnotations.map((anno, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border-default dark:border-[#2b5148] bg-canvas dark:bg-[#142622] p-3 text-sm shadow-xs"
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

      {/* Execution Steps */}
      {showSteps && testCase.steps && testCase.steps.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Execution Steps
          </h5>
          <div className="space-y-1">
            {testCase.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-md border border-border-default dark:border-[#2b5148] bg-canvas dark:bg-[#142622] p-2.5 text-sm shadow-xs"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${statusConfig[step.status].bg} text-xs font-bold`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium text-sm ${statusConfig[step.status].text}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-text-body-mid dark:text-text-muted tabular-nums">
                    {step.duration}ms
                  </p>

                  {/* Step Annotations */}
                  {step.annotations && step.annotations.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {step.annotations.map((anno, aIdx) => (
                        <span
                          key={aIdx}
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
                    <div className="mt-1 ml-2 border-l-2 border-border-default dark:border-border-default pl-2 space-y-1">
                      {step.subSteps.map((sub, i) => (
                        <p key={i} className="text-xs text-text-body-mid dark:text-text-muted">
                          ↳ {sub.title}{' '}
                          <span className="text-text-body-mid dark:text-text-muted">
                            ({sub.duration}ms)
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct Errors */}
      {testCase.errors && testCase.errors.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Test Failures
          </h5>
          <div className="space-y-2">
            {testCase.errors.map((err, idx) => (
              <div
                key={idx}
                className="rounded-md border border-danger-200 dark:border-danger-900/50 bg-canvas dark:bg-[#142622] overflow-hidden shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-danger-200 dark:border-danger-900/50 bg-danger-50 dark:bg-danger-500/10 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 text-danger-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span className="text-sm font-bold text-danger-600 dark:text-danger-500">
                      {err.name}
                    </span>
                  </div>
                  {err.location && (
                    <span className="text-xs font-mono text-text-body-mid dark:text-text-muted">
                      {err.location.file}:{err.location.line}:{err.location.column}
                    </span>
                  )}
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm text-danger-600 dark:text-danger-500 font-medium">
                    {err.message}
                  </p>

                  {err.cause && (
                    <div className="mt-2 rounded-md bg-danger-500/10 p-2 text-xs border border-danger-500/20">
                      <span className="font-bold text-danger-600 dark:text-danger-400">
                        Cause:{' '}
                      </span>
                      <span className="text-text-body-mid dark:text-text-muted">
                        {typeof err.cause === 'object'
                          ? JSON.stringify(err.cause)
                          : String(err.cause)}
                      </span>
                    </div>
                  )}

                  {err.snippet && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-text-body-mid dark:text-text-muted mb-1">
                        Code Snippet:
                      </p>
                      <pre
                        className="rounded-md bg-[#0d1a17] p-2.5 text-xs font-mono leading-relaxed text-[#f2f0eb] border border-[#213e37] overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: parseAnsiToHtml(err.snippet) }}
                      />
                    </div>
                  )}

                  {err.stack && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-text-body-mid dark:text-text-muted mb-1">
                        Stack Trace:
                      </p>
                      <pre className="rounded-md bg-[#0d1a17] p-3 text-xs font-mono leading-relaxed text-[#f2f0eb] border border-[#213e37] overflow-x-auto">
                        {err.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachments Section */}
      {attachments.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Attachments
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((att, idx) => {
              const url = getAttachmentUrl(att);
              const isImg = isImageAttachment(att);
              const isTxt = isTextAttachment(att);

              if (isImg && url) {
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-md border border-border-default dark:border-[#2b5148] bg-canvas dark:bg-[#142622] p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveAttachment({
                          name: att.name || 'Image Attachment',
                          url,
                          type: 'image',
                        })
                      }
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs text-text-ink dark:text-text-on-primary truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {att.name || 'Screenshot'}
                        </p>
                        <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                          Click to preview image
                        </p>
                      </div>
                    </button>
                    <a
                      href={url}
                      download={att.name || 'screenshot'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 text-text-body-mid dark:text-text-muted hover:bg-surface-200 dark:hover:bg-surface-200/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0"
                      title="Download image"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>
                  </div>
                );
              }

              if (isTxt) {
                const textContent = getTextContent(att);
                const mime = att.contentType || 'text/plain';
                const base64 =
                  typeof att.body === 'string'
                    ? att.body
                    : att.body
                      ? Buffer.from(att.body).toString('base64')
                      : btoa(unescape(encodeURIComponent(textContent)));
                const downloadHref = url && url !== '#' ? url : `data:${mime};base64,${base64}`;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-md border border-border-default dark:border-[#2b5148] bg-canvas dark:bg-[#142622] p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveAttachment({
                          name: att.name || 'Text Attachment',
                          url: downloadHref,
                          type: 'text',
                          contentType: mime,
                          content: textContent,
                        })
                      }
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs text-text-ink dark:text-text-on-primary truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {att.name || 'Text Attachment'}
                        </p>
                        <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                          Click to preview text
                        </p>
                      </div>
                    </button>
                    <a
                      href={downloadHref}
                      download={att.name || 'attachment.txt'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 text-text-body-mid dark:text-text-muted hover:bg-surface-200 dark:hover:bg-surface-200/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0"
                      title="Download text file"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>
                  </div>
                );
              }

              return (
                <a
                  key={idx}
                  href={url || '#'}
                  download={att.name || 'attachment'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md border border-border-default dark:border-[#2b5148] bg-canvas dark:bg-[#142622] p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-200 dark:bg-surface-200/40 text-text-body-mid shrink-0">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs text-text-ink dark:text-text-on-primary truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      {att.name || 'Attachment'}
                    </p>
                    <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                      Click to download
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 text-text-body-mid group-hover:text-primary-600 dark:group-hover:text-primary-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Standard Output (stdout) */}
      {testCase.stdout && testCase.stdout.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Standard Output (stdout)
          </h5>
          <pre className="rounded-md bg-[#0d1a17] p-3 text-xs font-mono leading-relaxed text-[#f2f0eb] border border-[#213e37] overflow-x-auto">
            {testCase.stdout.join('\n')}
          </pre>
        </div>
      )}

      {/* Standard Error (stderr) */}
      {testCase.stderr && testCase.stderr.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-danger-600 dark:text-danger-500">
            Standard Error (stderr)
          </h5>
          <pre className="rounded-md bg-danger-50 dark:bg-[#0d1a17] p-3 text-xs font-mono leading-relaxed text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-900/50 overflow-x-auto">
            {testCase.stderr.join('\n')}
          </pre>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {activeAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setActiveAttachment(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-surface-50 dark:bg-surface-100 p-4 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default dark:border-border-default/50 pb-3 mb-3 shrink-0">
              <h4 className="text-sm font-semibold text-text-ink dark:text-text-on-primary truncate pr-4">
                {activeAttachment.name}
              </h4>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={activeAttachment.url}
                  download={activeAttachment.name || 'attachment'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded px-2.5 py-1 text-text-body-mid bg-surface-200/50 dark:bg-surface-200/50 dark:text-text-on-primary hover:bg-surface-200 dark:hover:bg-success-600 hover:text-text-ink dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
                  title="Download file"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveAttachment(null)}
                  className="rounded p-1 text-text-body-mid dark:text-text-on-primary hover:bg-surface-200 dark:hover:bg-surface-200/80 hover:text-text-ink dark:hover:text-white transition-colors"
                  title="Close"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-auto flex-1 flex justify-center">
              {activeAttachment.type === 'image' ? (
                <img
                  src={activeAttachment.url}
                  alt={activeAttachment.name}
                  className="max-h-[75vh] w-auto object-contain rounded"
                />
              ) : (
                <pre className="w-full max-h-[75vh] overflow-y-auto rounded-md bg-[#0d1a17] p-4 text-xs font-mono leading-relaxed text-[#f2f0eb] border border-[#213e37] whitespace-pre-wrap break-words">
                  {activeAttachment.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No details */}
      {!testCase.steps &&
        !testCase.errors &&
        caseAnnotations.length === 0 &&
        attachments.length === 0 &&
        (!testCase.stdout || testCase.stdout.length === 0) &&
        (!testCase.stderr || testCase.stderr.length === 0) && (
          <p className="text-sm text-text-body-mid dark:text-text-muted italic">
            No detailed steps or errors recorded.
          </p>
        )}
    </>
  );
}
