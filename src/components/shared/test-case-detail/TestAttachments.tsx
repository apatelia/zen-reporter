import type { Attachment } from '@/lib/types/report';
import {
  isImageAttachment,
  isVideoAttachment,
  isTextAttachment,
  type UniversalPreviewItem,
} from './UniversalPreviewModal';

export interface TestAttachmentsProps {
  attachments: Attachment[];
  getAttachmentUrl: (att: Attachment) => string | null;
  previewItems?: UniversalPreviewItem[];
  onOpenPreview?: (itemIndex: number) => void;
}

export function TestAttachments({
  attachments,
  getAttachmentUrl,
  previewItems,
  onOpenPreview,
}: TestAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  const handleOpenAttachment = (att: Attachment) => {
    if (previewItems && onOpenPreview) {
      const idx = previewItems.findIndex(
        (item) =>
          item.attachment === att || (item.title === att.name && item.url === getAttachmentUrl(att))
      );
      if (idx !== -1) {
        onOpenPreview(idx);
        return;
      }
    }
  };

  return (
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
          const downloadHref = url && url !== '#' ? url : '#';
          const fileName = att.name || 'Attachment';

          // ICON RESOLUTION
          let icon = (
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
          );
          let subtitleText = 'Click to view file';

          if (isImg) {
            subtitleText = 'Click to preview image';
            icon = (
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            );
          } else if (isVid) {
            subtitleText = 'Click to play video';
            icon = (
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
            );
          } else if (isTxt) {
            subtitleText = 'Click to preview text';
            icon = (
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
            );
          }

          return (
            <div
              key={att.path || att.name || `${att.contentType}-${att.body?.length || 'file'}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-white dark:bg-surface-100/40 p-2.5 text-sm hover:border-accent-blue transition-colors shadow-xs group"
            >
              <button
                type="button"
                onClick={() => handleOpenAttachment(att)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-warning-500/10 text-warning-600 dark:text-warning-500 shrink-0">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs text-text-ink dark:text-text-on-primary truncate group-hover:text-accent-blue dark:group-hover:text-accent-blue">
                    {fileName}
                  </p>
                  <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                    {subtitleText}
                  </p>
                </div>
              </button>

              <a
                href={downloadHref}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1.5 text-text-body-mid dark:text-text-muted hover:bg-surface-200 dark:hover:bg-surface-200/50 hover:text-accent-blue dark:hover:text-accent-blue transition-colors shrink-0"
                title="Download attachment"
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
        })}
      </div>
    </div>
  );
}
