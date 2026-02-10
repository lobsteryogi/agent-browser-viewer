"use client";

import { useState, useCallback } from "react";

interface URLBarProps {
  url: string;
  title: string;
  isOpen: boolean;
  onNavigate: (url: string) => void;
}

export default function URLBar({ url, title, isOpen, onNavigate }: URLBarProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputUrl.trim()) {
        let navigateUrl = inputUrl.trim();
        if (!navigateUrl.startsWith("http://") && !navigateUrl.startsWith("https://")) {
          navigateUrl = `https://${navigateUrl}`;
        }
        onNavigate(navigateUrl);
        setIsEditing(false);
        setInputUrl("");
      }
    },
    [inputUrl, onNavigate]
  );

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b animate-fade-in-up"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      {/* Browser controls */}
      <div className="flex items-center gap-1.5">
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: isOpen ? "var(--success)" : "var(--danger)",
            transition: "background 0.3s ease",
            boxShadow: isOpen
              ? "0 0 6px var(--success)"
              : "0 0 6px var(--danger)",
          }}
        />
      </div>

      {/* Title */}
      {title && !isEditing && (
        <span
          className="truncate animate-fade-in-up"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-secondary)",
            maxWidth: "200px",
          }}
          title={title}
        >
          {title}
        </span>
      )}

      {/* URL Input */}
      <form onSubmit={handleSubmit} className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onBlur={() => {
              if (!inputUrl.trim()) setIsEditing(false);
            }}
            autoFocus
            placeholder="Enter URL..."
            className="command-input w-full"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--text-primary)",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "4px 10px",
              outline: "none",
            }}
          />
        ) : (
          <div
            className="url-bar flex-1 cursor-text"
            onClick={() => {
              setIsEditing(true);
              setInputUrl(url);
            }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: url ? "var(--text-primary)" : "var(--text-muted)",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "4px 10px",
              minHeight: "26px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {url ? (
              <>
                <span style={{ color: "var(--text-muted)" }}>
                  {url.startsWith("https") ? "🔒 " : "🔓 "}
                </span>
                <span className="truncate">{url}</span>
              </>
            ) : (
              <span>No page loaded</span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
