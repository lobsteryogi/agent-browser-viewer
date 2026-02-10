"use client";

interface StatusBarProps {
  connected: boolean;
  isOpen: boolean;
  lastActionTime: number;
  actionsCount: number;
}

function formatTimestamp(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function StatusBar({
  connected,
  isOpen,
  lastActionTime,
  actionsCount,
}: StatusBarProps) {
  return (
    <div
      className="flex items-center gap-4 px-3 py-1 border-t animate-fade-in-up"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-secondary)",
        minHeight: "28px",
      }}
    >
      {/* Connection */}
      <div className="flex items-center gap-1.5">
        <div
          className={`connection-dot ${connected ? "connected" : "disconnected"}`}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: connected ? "var(--success)" : "var(--danger)",
          }}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Browser status */}
      <div className="flex items-center gap-1.5">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-muted)",
          }}
        >
          Browser:
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: isOpen ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {isOpen ? "Active" : "Closed"}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions count */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--text-muted)",
        }}
      >
        {actionsCount} actions
      </span>

      {/* Last action */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--text-muted)",
        }}
      >
        Last: {formatTimestamp(lastActionTime)}
      </span>

      {/* Branding */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          color: "var(--text-muted)",
          opacity: 0.5,
        }}
      >
        Agent Browser Viewer
      </span>
    </div>
  );
}
