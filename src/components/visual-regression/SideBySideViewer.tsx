import React from 'react';

interface SideBySideViewerProps {
  actualUrl: string;
  expectedUrl: string;
  actualLabel?: string;
  expectedLabel?: string;
}

export const SideBySideViewer: React.FC<SideBySideViewerProps> = ({
  actualUrl,
  expectedUrl,
  actualLabel = 'Actual / Received',
  expectedLabel = 'Expected / Baseline',
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Expected */}
      <div className="flex flex-col gap-1.5 border border-border-default dark:border-border-default/50 rounded-lg p-3 bg-surface-50 dark:bg-surface-100/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {expectedLabel}
          </span>
        </div>
        <div className="flex items-center justify-center max-h-[60vh] overflow-hidden rounded bg-surface-950 p-1">
          <img
            src={expectedUrl}
            alt={expectedLabel}
            className="max-h-[58vh] w-auto object-contain rounded"
          />
        </div>
      </div>

      {/* Actual */}
      <div className="flex flex-col gap-1.5 border border-border-default dark:border-border-default/50 rounded-lg p-3 bg-surface-50 dark:bg-surface-100/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {actualLabel}
          </span>
        </div>
        <div className="flex items-center justify-center max-h-[60vh] overflow-hidden rounded bg-surface-950 p-1">
          <img
            src={actualUrl}
            alt={actualLabel}
            className="max-h-[58vh] w-auto object-contain rounded"
          />
        </div>
      </div>
    </div>
  );
};
