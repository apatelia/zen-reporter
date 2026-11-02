import React, { useState } from 'react';

interface DiffHighlightViewerProps {
  actualUrl: string;
  expectedUrl: string;
  diffUrl?: string;
  actualLabel?: string;
  expectedLabel?: string;
}

export const DiffHighlightViewer: React.FC<DiffHighlightViewerProps> = ({
  actualUrl,
  expectedUrl,
  diffUrl,
  actualLabel = 'Actual / Received',
  expectedLabel = 'Expected / Baseline',
}) => {
  const [useCssBlend, setUseCssBlend] = useState<boolean>(!diffUrl);

  return (
    <div className="flex flex-col gap-3 w-full">
      {diffUrl && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-text-body-mid dark:text-text-muted select-none">
            <input
              type="checkbox"
              checked={useCssBlend}
              onChange={(e) => setUseCssBlend(e.target.checked)}
              className="rounded border-border-default text-primary-600 focus:ring-primary-500"
            />
            <span>Use CSS Difference Blend Mode</span>
          </label>
        </div>
      )}

      <div className="relative w-full max-h-[70vh] overflow-hidden select-none rounded-lg border border-border-default dark:border-border-default/50 bg-surface-950 flex justify-center items-center p-2">
        {!useCssBlend && diffUrl ? (
          <img
            src={diffUrl}
            alt="Playwright Diff Artifact"
            className="max-h-[66vh] w-auto object-contain block rounded"
          />
        ) : (
          <div className="relative max-h-[66vh] flex justify-center items-center">
            {/* Base Image */}
            <img
              src={actualUrl}
              alt={actualLabel}
              className="max-h-[66vh] w-auto object-contain block rounded"
            />
            {/* Top Overlay with mix-blend-mode difference */}
            <img
              src={expectedUrl}
              alt={expectedLabel}
              className="absolute top-0 left-0 w-full h-full max-h-[66vh] object-contain block rounded pointer-events-none"
              style={{ mixBlendMode: 'difference' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface OnionSkinViewerProps {
  actualUrl: string;
  expectedUrl: string;
  actualLabel?: string;
  expectedLabel?: string;
}

export const OnionSkinViewer: React.FC<OnionSkinViewerProps> = ({
  actualUrl,
  expectedUrl,
  actualLabel = 'Actual',
  expectedLabel = 'Expected',
}) => {
  const [opacity, setOpacity] = useState<number>(50);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between bg-surface-100/50 dark:bg-surface-200/20 p-2.5 rounded-lg border border-border-default dark:border-border-default/50 text-xs">
        <span className="font-medium text-text-body-mid dark:text-text-muted">
          Opacity: {opacity}% ({expectedLabel} over {actualLabel})
        </span>
        <div className="flex items-center gap-3 w-1/2 max-w-xs">
          <span className="text-[11px] text-text-body-mid font-mono">0%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="onion-opacity-slider w-full rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <span className="text-[11px] text-text-body-mid font-mono">100%</span>
        </div>
      </div>

      <div className="relative w-full max-h-[70vh] overflow-hidden select-none rounded-lg border border-border-default dark:border-border-default/50 bg-surface-950 flex justify-center items-center p-2">
        <div className="relative max-h-[66vh] flex justify-center items-center">
          {/* Base: Actual Image */}
          <img
            src={actualUrl}
            alt={actualLabel}
            className="max-h-[66vh] w-auto object-contain block rounded"
          />
          {/* Top: Expected Image with Dynamic Opacity */}
          <img
            src={expectedUrl}
            alt={expectedLabel}
            className="absolute top-0 left-0 w-full h-full max-h-[66vh] object-contain block rounded pointer-events-none transition-opacity duration-75"
            style={{ opacity: opacity / 100 }}
          />
        </div>
      </div>
    </div>
  );
};
