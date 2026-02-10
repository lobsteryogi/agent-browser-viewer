"use client";

import { useEffect, useRef } from "react";

interface ActionEntry {
  id: string;
  type: string;
  command: string;
  timestamp: number;
  result?: string;
  error?: string;
}

const ACTION_EMOJIS: Record<string, string> = {
  open: "🌐",
  click: "👆",
  dblclick: "👆",
  fill: "⌨️",
  type: "⌨️",
  screenshot: "📸",
  scroll: "📜",
  hover: "🎯",
  press: "⌨️",
  select: "📋",
  snapshot: "🌳",
  reload: "🔄",
  back: "⬅️",
  forward: "➡️",
  close: "🚪",
  eval: "⚡",
  wait: "⏳",
  drag: "🖱️",
  focus: "🔍",
  check: "☑️",
  uncheck: "☑️",
  mouse: "🖱️",
};

function getEmoji(type: string): string {
  return ACTION_EMOJIS[type] || "▶️";
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ActionLog({ actions }: { actions: ActionEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actions.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-tertiary)",
        }}
      >
        <span style={{ fontSize: "12px" }}>📋</span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Action Log
        </span>
        <span
          className="ml-auto"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            padding: "1px 6px",
            borderRadius: "4px",
          }}
        >
          {actions.length}
        </span>
      </div>

      {/* Actions List */}
      <div className="flex-1 overflow-y-auto p-1">
        {actions.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full gap-2 animate-fade-in-up"
            style={{ color: "var(--text-muted)" }}
          >
            <span style={{ fontSize: "24px", opacity: 0.5 }}>🎯</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "12px" }}>
              No actions yet
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>
              Execute a command to begin
            </span>
          </div>
        )}

        {actions.map((action, index) => (
          <div
            key={action.id}
            className="action-item px-2 py-1.5 mx-1 mb-0.5 rounded border-l-2"
            style={{
              borderLeftColor: action.error
                ? "var(--danger)"
                : action.result
                ? "var(--accent)"
                : "var(--border)",
              animationDelay: `${Math.min(index * 0.03, 0.3)}s`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: "12px" }}>{getEmoji(action.type)}</span>
              <span
                className="truncate flex-1"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-primary)",
                }}
                title={action.command}
              >
                {action.command}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 pl-5">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  color: "var(--text-muted)",
                }}
              >
                {formatTime(action.timestamp)}
              </span>
              {action.error && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: "var(--danger)",
                  }}
                  className="truncate"
                  title={action.error}
                >
                  ✗ {action.error.slice(0, 40)}
                </span>
              )}
              {action.result && !action.error && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: "var(--success)",
                  }}
                >
                  ✓
                </span>
              )}
              {!action.result && !action.error && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: "var(--warning)",
                  }}
                >
                  ⏳
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
