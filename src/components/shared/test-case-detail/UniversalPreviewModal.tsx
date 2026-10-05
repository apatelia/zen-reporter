import { useState, useEffect, useMemo, useCallback } from 'react';
import BaseModal from '../BaseModal';
import type { Attachment } from '@/lib/types/report';
import type { AttemptView } from './AttemptView';

export interface UniversalPreviewItem {
  id: string;
  type: 'text' | 'image' | 'video' | 'binary';
  title: string;
  subtitle?: string;
  url?: string;
  lines?: string[];
  content?: string;
  isLoading?: boolean;
  error?: string | null;
  downloadFileName?: string;
  downloadUrl?: string;
  contentType?: string;
  attachment?: Attachment;
}

export interface UniversalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: UniversalPreviewItem[];
  initialIndex?: number;
}

export function isImageAttachment(att: Attachment): boolean {
  return (
    (att.contentType && att.contentType.startsWith('image/')) ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || att.path || '')
  );
}

export function isVideoAttachment(att: Attachment): boolean {
  return (
    (att.contentType && att.contentType.startsWith('video/')) ||
    /\.(mp4|webm|ogg|ogv|mov|avi)$/i.test(att.name || att.path || '')
  );
}

export function isTextAttachment(att: Attachment): boolean {
  return (
    (att.contentType && att.contentType.startsWith('text/')) ||
    /\.(txt|log|json|csv|html|xml|md|yaml|yml|js|ts|jsx|tsx|css)$/i.test(att.name || att.path || '')
  );
}

export function buildAttemptPreviewItems(
  attempt: AttemptView,
  attachments: Attachment[],
  getAttachmentUrl: (att: Attachment) => string | null
): UniversalPreviewItem[] {
  const items: UniversalPreviewItem[] = [];

  if (attempt.stdout && attempt.stdout.length > 0) {
    items.push({
      id: 'stdout',
      type: 'text',
      title: 'Standard Output (stdout)',
      subtitle: 'Log',
      lines: attempt.stdout,
      downloadFileName: 'test-stdout.log',
    });
  }

  if (attempt.stderr && attempt.stderr.length > 0) {
    items.push({
      id: 'stderr',
      type: 'text',
      title: 'Standard Error (stderr)',
      subtitle: 'Error Log',
      lines: attempt.stderr,
      downloadFileName: 'test-stderr.log',
    });
  }

  attachments.forEach((att, idx) => {
    const url = getAttachmentUrl(att) || undefined;
    let type: 'text' | 'image' | 'video' | 'binary' = 'binary';
    let subtitle = 'File';

    if (isImageAttachment(att)) {
      type = 'image';
      subtitle = 'Image';
    } else if (isVideoAttachment(att)) {
      type = 'video';
      subtitle = 'Video';
    } else if (isTextAttachment(att)) {
      type = 'text';
      subtitle = 'Text';
    }

    let initialContent: string | undefined = undefined;
    if (att.body) {
      if (type === 'text') {
        initialContent = att.body;
      } else {
        try {
          initialContent = atob(att.body);
        } catch {
          initialContent = att.body;
        }
      }
    }

    items.push({
      id: `att-${idx}-${att.name || att.path || 'file'}`,
      type,
      title: att.name || 'Attachment',
      subtitle,
      url,
      downloadUrl: url,
      downloadFileName: att.name || (type === 'text' ? 'attachment.txt' : 'attachment'),
      contentType: att.contentType,
      lines: initialContent ? initialContent.split('\n') : undefined,
      attachment: att,
    });
  });

  return items;
}

export function UniversalPreviewModal({
  isOpen,
  onClose,
  items,
  initialIndex = 0,
}: UniversalPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loadedContents, setLoadedContents] = useState<
    Record<
      string,
      { content?: string; lines?: string[]; isLoading?: boolean; error?: string | null }
    >
  >({});
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Sync initialIndex when modal opens or initialIndex changes
  const [prevSyncProps, setPrevSyncProps] = useState({
    isOpen,
    initialIndex,
    itemsLength: items.length,
  });
  if (
    prevSyncProps.isOpen !== isOpen ||
    prevSyncProps.initialIndex !== initialIndex ||
    prevSyncProps.itemsLength !== items.length
  ) {
    setPrevSyncProps({ isOpen, initialIndex, itemsLength: items.length });
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, items.length - 1)));
      setSearchTerm('');
      setZoomLevel(1);
    }
  }

  const activeItem = items[currentIndex] || null;

  // Reset zoom & search term when switching active item
  const [prevCurrentIndex, setPrevCurrentIndex] = useState(currentIndex);
  if (prevCurrentIndex !== currentIndex) {
    setPrevCurrentIndex(currentIndex);
    setZoomLevel(1);
    setSearchTerm('');
  }

  // Lazy-load text content if needed for text items
  const activeItemId = activeItem?.id;
  const activeItemUrl = activeItem?.url;
  const activeItemType = activeItem?.type;
  const activeItemLines = activeItem?.lines;
  const activeItemContent = activeItem?.content;

  useEffect(() => {
    if (!isOpen || !activeItem || activeItemType !== 'text') return;

    // Check if lines or content are already available in item
    if (activeItemLines || activeItemContent) return;

    // Check if item is already loaded or loading in cache
    const existingCache = loadedContents[activeItem.id];
    if (existingCache) return;

    if (!activeItemUrl) return;

    const controller = new AbortController();

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoadedContents((prev) => ({
          ...prev,
          [activeItem.id]: { isLoading: true, error: null },
        }));
      }
    });

    fetch(activeItemUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const contentType = res.headers.get('content-type') || '';
        // If SPA router falls back to index.html (text/html) when attachment file is missing or not served:
        if (
          contentType.includes('text/html') &&
          !activeItemUrl.endsWith('.html') &&
          !activeItemUrl.endsWith('.htm')
        ) {
          throw new Error('Attachment file not found (server returned HTML SPA fallback page)');
        }
        return res.text();
      })
      .then((text) => {
        if (!controller.signal.aborted) {
          setLoadedContents((prev) => ({
            ...prev,
            [activeItem.id]: {
              content: text,
              lines: text.split('\n'),
              isLoading: false,
              error: null,
            },
          }));
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setLoadedContents((prev) => ({
          ...prev,
          [activeItem.id]: {
            isLoading: false,
            error: err.message || 'Failed to load text content',
          },
        }));
      });

    return () => {
      controller.abort();
    };
  }, [
    isOpen,
    activeItem,
    activeItemId,
    activeItemUrl,
    activeItemType,
    activeItemLines,
    activeItemContent,
    loadedContents,
  ]);

  // Derived state for current item text content
  const currentTextState = useMemo(() => {
    if (!activeItem || activeItem.type !== 'text') {
      return { lines: [], isLoading: false, error: null };
    }

    if (activeItem.lines) {
      return { lines: activeItem.lines, isLoading: false, error: null };
    }

    if (activeItem.content) {
      return { lines: activeItem.content.split('\n'), isLoading: false, error: null };
    }

    const cached = loadedContents[activeItem.id];
    if (cached) {
      return {
        lines: cached.lines || (cached.content ? cached.content.split('\n') : []),
        isLoading: Boolean(cached.isLoading),
        error: cached.error || null,
      };
    }

    return {
      lines: [],
      isLoading: Boolean(activeItem.isLoading || activeItem.url),
      error: activeItem.error || null,
    };
  }, [activeItem, loadedContents]);

  // Filter text lines based on search term
  const filteredLines = useMemo(() => {
    if (
      !isOpen ||
      !activeItem ||
      activeItem.type !== 'text' ||
      currentTextState.isLoading ||
      currentTextState.error
    ) {
      return [];
    }
    const lines = currentTextState.lines;
    if (!searchTerm.trim()) {
      return lines.map((text, index) => ({ originalLineNum: index + 1, text }));
    }
    const lower = searchTerm.toLowerCase();
    return lines
      .map((text, index) => ({ originalLineNum: index + 1, text }))
      .filter((line) => line.text.toLowerCase().includes(lower));
  }, [isOpen, activeItem, currentTextState, searchTerm]);

  // Navigation Handlers
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, items.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || items.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not navigate slides if typing inside input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items.length, handlePrev, handleNext]);

  if (!isOpen || !activeItem) return null;

  const downloadUrl = activeItem.downloadUrl || activeItem.url;
  const downloadFileName = activeItem.downloadFileName || activeItem.title || 'attachment';

  const handleCopy = () => {
    if (currentTextState.lines.length > 0) {
      navigator.clipboard.writeText(currentTextState.lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = downloadFileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    } else if (currentTextState.lines.length > 0) {
      const blob = new Blob([currentTextState.lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      maxHeightClass="h-[85vh]"
      title={
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <h4 className="text-base font-bold text-text-ink dark:text-text-on-primary truncate">
            {activeItem.title}
          </h4>

          {/* Item Count & Subtitle Badges */}
          {activeItem.type === 'text' && !currentTextState.isLoading && !currentTextState.error && (
            <span className="rounded-full bg-surface-200 dark:bg-surface-200/50 px-2.5 py-0.5 text-xs font-mono font-medium text-text-body-mid shrink-0">
              {currentTextState.lines.length} lines
            </span>
          )}

          {activeItem.subtitle && (
            <span className="rounded-full bg-accent-blue/10 text-accent-blue px-2.5 py-0.5 text-xs font-medium shrink-0">
              {activeItem.subtitle}
            </span>
          )}

          {items.length > 1 && (
            <span className="text-xs text-text-body-mid dark:text-text-muted shrink-0 font-medium">
              ({currentIndex + 1} of {items.length})
            </span>
          )}
        </div>
      }
      headerActions={
        <div className="flex items-center gap-2.5">
          {/* Previous / Next Navigation */}
          {items.length > 1 && (
            <div className="flex items-center gap-1 border-r border-border-default pr-2 mr-0.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:bg-surface-200/50 dark:hover:text-text-on-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous artifact (←)"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= items.length - 1}
                className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:bg-surface-200/50 dark:hover:text-text-on-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next artifact (→)"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-text-on-primary dark:text-surface-950 bg-accent-blue hover:bg-accent-blue/90 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Download file"
          >
            <svg
              className="h-4 w-4 text-text-on-primary dark:text-surface-950"
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
          </button>
        </div>
      }
    >
      {/* Modal Content Body Viewport */}
      <div className="h-full flex flex-col min-h-0">
        {/* VIEWPORT 1: TEXT LOG VIEWPORT */}
        {activeItem.type === 'text' && (
          <div className="h-full flex flex-col min-h-0 rounded-md bg-surface-100 dark:bg-surface-950 border border-border-default dark:border-border-subtle overflow-hidden">
            {/* Text Viewer Context Toolbar */}
            {!currentTextState.isLoading && !currentTextState.error && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border-default dark:border-border-subtle bg-surface-50 dark:bg-surface-100/50 shrink-0">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-xs sm:max-w-sm">
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search log..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-border-default dark:border-border-subtle bg-canvas dark:bg-surface-200/50 pl-8.5 pr-7 py-1 text-xs text-text-ink dark:text-text-on-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-hidden"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-ink cursor-pointer text-sm font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Copy All Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default dark:border-border-subtle bg-canvas dark:bg-surface-200/50 px-2.5 py-1 text-xs font-semibold text-text-ink dark:text-text-on-primary hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  {copied ? (
                    <>
                      <svg
                        className="h-3.5 w-3.5 text-success-600 dark:text-success-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-success-600 dark:text-success-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-3.5 w-3.5 text-text-body-mid dark:text-text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy All
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-text-ink dark:text-slate-200">
              {currentTextState.isLoading ? (
                <div className="flex h-full min-h-60 items-center justify-center gap-3 text-text-body-mid dark:text-text-muted">
                  <svg
                    className="h-5 w-5 animate-spin text-accent-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Loading log content...</span>
                </div>
              ) : currentTextState.error ? (
                <div className="flex h-full min-h-60 items-center justify-center p-4">
                  <div className="rounded-md border border-danger-500/20 bg-danger-500/10 p-4 text-center text-xs text-danger-600 dark:text-danger-400 max-w-md">
                    <p className="font-semibold mb-1">Error Loading Content</p>
                    <p>{currentTextState.error}</p>
                  </div>
                </div>
              ) : filteredLines.length === 0 ? (
                <div className="flex h-full min-h-50 items-center justify-center text-text-muted italic">
                  {searchTerm
                    ? `No matching lines found for "${searchTerm}"`
                    : 'Log content is empty.'}
                </div>
              ) : (
                <div className="table w-full border-collapse">
                  {filteredLines.map(({ originalLineNum, text }) => (
                    <div
                      key={`text-line-${originalLineNum}`}
                      className="table-row hover:bg-surface-200/50 dark:hover:bg-surface-900/60"
                    >
                      <span className="table-cell pr-4 text-right select-none font-mono text-[11px] font-medium text-text-muted dark:text-slate-500 w-12 border-r border-border-default/60 dark:border-slate-800">
                        {originalLineNum}
                      </span>
                      <span className="table-cell pl-4 whitespace-pre-wrap break-all">{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEWPORT 2: IMAGE VIEWPORT WITH ZOOM CONTROLS */}
        {activeItem.type === 'image' && (
          <div
            className="relative h-full overflow-auto flex items-center justify-center rounded-md bg-slate-950/80 p-4 border border-border-default dark:border-border-subtle"
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                setZoomLevel((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
              } else {
                setZoomLevel((prev) => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100));
              }
            }}
          >
            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-lg bg-black/75 p-1 text-white backdrop-blur-xs shadow-lg border border-white/10">
              <button
                type="button"
                onClick={() =>
                  setZoomLevel((prev) => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100))
                }
                disabled={zoomLevel <= 0.25}
                className="rounded p-1 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2 py-0.5 text-xs font-mono font-semibold hover:bg-white/20 rounded transition-colors cursor-pointer"
                title="Reset Zoom (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={() =>
                  setZoomLevel((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100))
                }
                disabled={zoomLevel >= 4}
                className="rounded p-1 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Scaled Image */}
            <div className="h-full w-full flex items-center justify-center overflow-auto">
              <img
                src={activeItem.url}
                alt={activeItem.title}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                className="max-h-[72vh] max-w-full object-contain rounded transition-transform duration-150 ease-out shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* VIEWPORT 3: VIDEO VIEWPORT */}
        {activeItem.type === 'video' && (
          <div className="h-full flex items-center justify-center rounded-md bg-slate-950 p-4 border border-border-default dark:border-border-subtle">
            <video
              controls
              autoPlay
              src={activeItem.url}
              className="max-h-[72vh] w-auto object-contain rounded shadow-2xl"
            >
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {/* VIEWPORT 4: BINARY / UNKNOWN FILE FALLBACK VIEWPORT */}
        {activeItem.type === 'binary' && (
          <div className="h-full flex flex-col items-center justify-center rounded-md bg-surface-100 dark:bg-surface-950 p-8 border border-border-default dark:border-border-subtle text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/10 text-accent-blue mb-4 shadow-inner">
              <svg
                className="h-8 w-8"
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
            <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary mb-1 truncate max-w-md">
              {activeItem.title}
            </h3>
            {activeItem.contentType && (
              <span className="rounded-full bg-surface-200 dark:bg-surface-200/50 px-3 py-1 text-xs font-mono font-medium text-text-body-mid mb-4">
                {activeItem.contentType}
              </span>
            )}
            <p className="text-xs text-text-body-mid dark:text-text-muted max-w-md leading-relaxed mb-6">
              This file type cannot be previewed directly in the browser. You can download the file
              to inspect it with an external application.
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-full bg-accent-blue px-5 py-2 text-xs font-semibold text-text-on-primary dark:text-surface-950 hover:bg-accent-blue/90 transition-colors shadow-md cursor-pointer"
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
              Download Attachment
            </button>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
