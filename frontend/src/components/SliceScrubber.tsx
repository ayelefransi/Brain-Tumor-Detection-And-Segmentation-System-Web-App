"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface SliceScrubberProps {
  slices: string[];
  label: string;
  initialSlice?: number;
}

export default function SliceScrubber({ slices, label, initialSlice }: SliceScrubberProps) {
  const total = slices.length;
  const [index, setIndex] = useState(initialSlice ?? Math.floor(total / 2));
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Clamp helper
  const clamp = (val: number) => Math.max(0, Math.min(total - 1, val));

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((prev) => clamp(prev + (e.shiftKey ? 10 : 1)));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((prev) => clamp(prev - (e.shiftKey ? 10 : 1)));
      }
    },
    [total]
  );

  // Attach keyboard listener when focused
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("keydown", handleKeyDown as any);
    return () => el.removeEventListener("keydown", handleKeyDown as any);
  }, [handleKeyDown]);

  // Update image src via ref for zero-rerender scrubbing
  useEffect(() => {
    if (imgRef.current && slices[index]) {
      imgRef.current.src = slices[index];
    }
  }, [index, slices]);

  if (!slices || slices.length === 0) {
    return (
      <div className="slice-scrubber">
        <div className="slice-label">{label}</div>
        <div className="slice-empty">No slices available</div>
      </div>
    );
  }

  return (
    <div
      className="slice-scrubber"
      ref={containerRef}
      tabIndex={0}
      title="Click to focus, then use Arrow Keys (Shift+Arrow for ×10)"
    >
      <div className="slice-label">{label}</div>
      <div className="slice-viewport">
        <img
          ref={imgRef}
          src={slices[index]}
          alt={`${label} slice ${index}`}
          className="slice-image"
          draggable={false}
        />
        <div className="slice-index-badge">
          {index + 1} / {total}
        </div>
      </div>
      <div className="slice-controls">
        <input
          type="range"
          min={0}
          max={total - 1}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="slice-slider"
        />
        <div className="slice-hint">
          <kbd>←</kbd><kbd>→</kbd> navigate · <kbd>Shift</kbd> ×10
        </div>
      </div>
    </div>
  );
}
