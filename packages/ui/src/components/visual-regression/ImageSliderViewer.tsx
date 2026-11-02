import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageSliderViewerProps {
  actualUrl: string;
  expectedUrl: string;
  actualLabel?: string;
  expectedLabel?: string;
}

export const ImageSliderViewer: React.FC<ImageSliderViewerProps> = ({
  actualUrl,
  expectedUrl,
  actualLabel = 'Actual / Received',
  expectedLabel = 'Expected / Baseline',
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    updateContainerWidth();
    const observer = new ResizeObserver(() => updateContainerWidth());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateContainerWidth]);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPos(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updatePosition(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Container */}
      <div
        ref={containerRef}
        className="relative w-full max-h-[70vh] overflow-hidden select-none cursor-ew-resize rounded-lg border border-border-default dark:border-border-default/50 bg-surface-950 flex justify-center items-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Bottom Layer: Actual (Received) Image */}
        <img
          src={actualUrl}
          alt={actualLabel}
          onLoad={updateContainerWidth}
          className="w-full h-auto max-h-[70vh] object-contain block pointer-events-none"
        />

        {/* Top Layer: Expected (Baseline) Image with Clipping */}
        <div
          className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={expectedUrl}
            alt={expectedLabel}
            onLoad={updateContainerWidth}
            className="h-auto max-h-[70vh] object-contain block pointer-events-none"
            style={{
              width: containerWidth > 0 ? `${containerWidth}px` : '100%',
              maxWidth: 'none',
            }}
          />
        </div>

        {/* Slider Divider Line & Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none z-10 flex items-center justify-center"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-surface-100 text-text-ink dark:text-text-on-primary shadow-lg border border-border-default flex items-center justify-center text-xs font-bold shrink-0">
            <svg
              className="w-4 h-4 text-text-body-mid"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3m8-6l3 3-3 3" />
            </svg>
          </div>
        </div>

        {/* Accessible Range Input */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="sr-only"
          aria-label="Visual Diff Slider"
        />

        {/* Top Labels */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded text-xs font-semibold z-20 pointer-events-none">
          {expectedLabel}
        </div>
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded text-xs font-semibold z-20 pointer-events-none">
          {actualLabel}
        </div>
      </div>
    </div>
  );
};
