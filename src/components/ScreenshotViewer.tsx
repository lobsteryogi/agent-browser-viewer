"use client";

import { useCallback, useRef, useState } from "react";

interface ScreenshotViewerProps {
  screenshot: string;
  isExecuting: boolean;
  onClickAt: (x: number, y: number) => void;
}

export default function ScreenshotViewer({
  screenshot,
  isExecuting,
  onClickAt,
}: ScreenshotViewerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [clickMarker, setClickMarker] = useState<{ x: number; y: number } | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;

      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);

      setClickMarker({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      setTimeout(() => setClickMarker(null), 600);

      onClickAt(x, y);
    },
    [onClickAt]
  );

  if (!screenshot) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 animate-fade-in-up"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "12px",
            background: "var(--bg-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
          className="animate-scale-in"
        >
          🖥️
        </div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            No browser session
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            open https://example.com
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="screenshot-container flex items-center justify-center h-full relative click-overlay"
      style={{ background: "var(--bg-primary)", padding: "8px" }}
      onClick={handleClick}
    >
      {/* Loading overlay */}
      {isExecuting && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{
            background: "rgba(10, 10, 12, 0.3)",
            backdropFilter: "blur(1px)",
          }}
        >
          <div
            className="animate-pulse-glow"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--accent)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--accent)",
            }}
          >
            Executing...
          </div>
        </div>
      )}

      {/* Screenshot */}
      <img
        ref={imgRef}
        src={screenshot}
        alt="Browser Screenshot"
        className="animate-scale-in"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: "6px",
          border: "1px solid var(--border-subtle)",
        }}
      />

      {/* Click marker */}
      {clickMarker && (
        <div
          className="click-marker"
          style={{
            left: clickMarker.x,
            top: clickMarker.y,
          }}
        />
      )}
    </div>
  );
}
