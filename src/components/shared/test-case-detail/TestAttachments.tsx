import { useState } from 'react';
import type { Attachment } from '@/lib/types/report';

export interface TestAttachmentsProps {
  attachments: Attachment[];
  getAttachmentUrl: (att: Attachment) => string | null;
}

export function TestAttachments({ attachments, getAttachmentUrl }: TestAttachmentsProps) {
  const [activeAttachment, setActiveAttachment] = useState<{
    name: string;
    url: string;
    type: 'image' | 'text' | 'video';
    contentType?: string;
    content?: string;
  } | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const isImageAttachment = (att: Attachment): boolean => {
    return (
      (att.contentType && att.contentType.startsWith('image/')) ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || att.path || '')
    );
  };

  const isVideoAttachment = (att: Attachment): boolean => {
    return (
      (att.contentType && att.contentType.startsWith('video/')) ||
      /\.(mp4|webm|ogg|ogv|mov|avi)$/i.test(att.name || att.path || '')
    );
  };

  const isTextAttachment = (att: Attachment): boolean => {
    return (
      (att.contentType && att.contentType.startsWith('text/')) ||
      /\.(txt|log|json|csv|html|xml|md|yaml|yml|js|ts|jsx|tsx|css)$/i.test(
        att.name || att.path || ''
      )
    );
  };

  const getTextContent = (att: Attachment): string => {
    if (att.body) {
      try {
        return atob(att.body);
      } catch {
        return att.body;
      }
    }
    return '';
  };

  return (
    <>
      <div className="mb-4">
        <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
          Attachments
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.map((att) => {
            const url = getAttachmentUrl(att);
            const isImg = isImageAttachment(att);
            const isTxt = isTextAttachment(att);
            const isVid = isVideoAttachment(att);

            if (isImg && url) {
              return (
                <div
                  key={`img-${att.path || att.name || 'image'}-${att.contentType || ''}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-white dark:bg-surface-100/40 p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
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
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-warning-500/10 text-warning-600 dark:text-warning-500 shrink-0">
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

            if (isVid && url) {
              return (
                <div
                  key={`vid-${att.path || att.name || 'video'}-${att.contentType || ''}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-surface-100/40 dark:bg-surface-100/30 p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveAttachment({
                        name: att.name || 'Video Attachment',
                        url,
                        type: 'video',
                      })
                    }
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-100 dark:bg-surface-200/50 text-text-body-mid dark:text-text-muted group-hover:text-primary-600 dark:group-hover:text-primary-400">
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
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-xs text-text-ink dark:text-text-on-primary truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {att.name || 'Video Attachment'}
                      </p>
                      <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                        Click to play video
                      </p>
                    </div>
                  </button>

                  <a
                    href={url}
                    download={att.name || 'video'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-text-body-mid dark:text-text-muted hover:bg-surface-200 dark:hover:bg-surface-200/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0"
                    title="Download video"
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
                att.body || (typeof btoa === 'function' ? btoa(textContent) : textContent);
              const downloadHref = url && url !== '#' ? url : `data:${mime};base64,${base64}`;

              return (
                <div
                  key={`txt-${att.path || att.name || 'text'}-${mime}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-white dark:bg-surface-100/40 p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
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
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-warning-500/10 text-warning-600 dark:text-warning-500 shrink-0">
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

            const isZip =
              att.name?.endsWith('.zip') ||
              att.contentType === 'application/zip' ||
              att.contentType === 'application/x-zip-compressed';

            return (
              <a
                key={`att-${att.path || att.name || 'file'}-${att.contentType || ''}`}
                href={url || '#'}
                download={att.name || 'attachment'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-md border border-border-default bg-white dark:bg-surface-100/40 p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-warning-500/10 text-warning-600 dark:text-warning-500 shrink-0">
                  {isZip ? (
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
                        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                      />
                    </svg>
                  ) : (
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
                  )}
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
                  className="h-4 w-4 text-text-body-mid group-hover:text-primary-600 dark:text-text-muted group-hover:text-primary-400 shrink-0"
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
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-text-on-primary bg-accent-blue hover:bg-accent-blue/90 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Download file"
                >
                  <svg
                    className="h-4 w-4 text-white"
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
                  className="rounded-md p-1.5 text-text-body-mid hover:text-danger-600 bg-surface-100 hover:bg-danger-50 dark:bg-surface-200/50 dark:text-text-on-primary dark:hover:bg-danger-500/20 dark:hover:text-danger-400 border border-border-default dark:border-border-default/50 transition-colors"
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
              ) : activeAttachment.type === 'video' ? (
                <video
                  controls
                  autoPlay
                  src={activeAttachment.url}
                  className="max-h-[75vh] w-auto object-contain rounded"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <pre className="w-full max-h-[75vh] overflow-y-auto rounded-md bg-surface-950 p-4 text-xs font-mono leading-relaxed text-canvas dark:text-surface-900 border border-border-default dark:border-border-subtle whitespace-pre-wrap wrap-break-word">
                  {activeAttachment.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
