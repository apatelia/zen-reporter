import React, { useState, useEffect } from 'react';
import { ViewMode, ViewModeSelector } from './ViewModeSelector';
import { ImageSliderViewer } from './ImageSliderViewer';
import { SideBySideViewer } from './SideBySideViewer';
import { DiffHighlightViewer, OnionSkinViewer } from './DiffHighlightViewer';

export interface VisualDiffPair {
  actualUrl: string;
  expectedUrl: string;
  diffUrl?: string;
  name?: string;
}

interface VisualDiffViewerProps {
  pair: VisualDiffPair;
  onClose?: () => void;
}

export const VisualDiffViewer: React.FC<VisualDiffViewerProps> = ({ pair, onClose }) => {
  const [mode, setMode] = useState<ViewMode>('slider');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === '1') {
        setMode('slider');
      } else if (e.key === '2') {
        setMode('side-by-side');
      } else if (e.key === '3' && pair.diffUrl) {
        setMode('diff');
      } else if (e.key === '4') {
        setMode('onion');
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pair.diffUrl, onClose]);

  return (
    <div className="flex flex-col gap-3 w-full bg-canvas p-4 rounded-lg border border-border-default shadow-lg">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border-default">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
            <svg
              className="w-4 h-4"
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
          <div>
            <h4 className="text-sm font-bold text-text-ink dark:text-text-on-primary">
              Visual Regression Diff
            </h4>
            {pair.name && (
              <p className="text-xs text-text-body-mid dark:text-text-muted truncate max-w-xs">
                {pair.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ViewModeSelector mode={mode} onModeChange={setMode} hasDiffImage={!!pair.diffUrl} />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:bg-surface-200/50 dark:hover:text-text-on-primary transition-colors cursor-pointer"
              title="Close viewer"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        {mode === 'slider' && (
          <ImageSliderViewer actualUrl={pair.actualUrl} expectedUrl={pair.expectedUrl} />
        )}
        {mode === 'side-by-side' && (
          <SideBySideViewer actualUrl={pair.actualUrl} expectedUrl={pair.expectedUrl} />
        )}
        {mode === 'diff' && (
          <DiffHighlightViewer
            actualUrl={pair.actualUrl}
            expectedUrl={pair.expectedUrl}
            diffUrl={pair.diffUrl}
          />
        )}
        {mode === 'onion' && (
          <OnionSkinViewer actualUrl={pair.actualUrl} expectedUrl={pair.expectedUrl} />
        )}
      </div>
    </div>
  );
};
