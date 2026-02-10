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
  const containerRef = useRef<HTMLDivElement>(null);
  const [clickMarker, setClickMarker] = useState<{ x: number; y: number } | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = imgRef.current;
      const container = containerRef.current;
      if (!img || !container) return;

      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Click position relative to the image element
      const clickOnImgX = e.clientX - imgRect.left;
      const clickOnImgY = e.clientY - imgRect.top;

      // Ignore clicks outside the image
      if (
        clickOnImgX < 0 ||
        clickOnImgY < 0 ||
        clickOnImgX > imgRect.width ||
        clickOnImgY > imgRect.height
      ) {
        return;
      }

      // Scale from rendered image size to actual viewport coordinates
      // naturalWidth/Height = screenshot pixel size = viewport size (DPR=1)
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;

      const actualX = Math.round(clickOnImgX * scaleX);
      const actualY = Math.round(clickOnImgY * scaleY);

      // Position marker relative to the container (absolute positioning)
      const markerX = e.clientX - containerRect.left;
      const markerY = e.clientY - containerRect.top;

      setClickMarker({ x: markerX, y: markerY });
      setTimeout(() => setClickMarker(null), 600);

      onClickAt(actualX, actualY);
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
      ref={containerRef}
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
        draggable={false}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: "6px",
          border: "1px solid var(--border-subtle)",
          userSelect: "none",
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
