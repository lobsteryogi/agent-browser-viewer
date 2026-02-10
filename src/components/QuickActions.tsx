"use client";

interface QuickActionsProps {
  onCommand: (command: string) => void;
  onSnapshot: () => void;
}

const ACTIONS = [
  { label: "📸", title: "Screenshot", command: "screenshot" },
  { label: "🔄", title: "Reload", command: "reload" },
  { label: "⬆️", title: "Scroll Up", command: "scroll up 300" },
  { label: "⬇️", title: "Scroll Down", command: "scroll down 300" },
  { label: "⬅️", title: "Back", command: "back" },
  { label: "➡️", title: "Forward", command: "forward" },
  { label: "🏠", title: "Home", command: "open about:blank" },
];

export default function QuickActions({ onCommand, onSnapshot }: QuickActionsProps) {
  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {ACTIONS.map((action, i) => (
        <button
          key={action.command}
          onClick={() => onCommand(action.command)}
          className="quick-btn animate-scale-in"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "12px",
            color: "var(--text-secondary)",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "6px",
            padding: "3px 8px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            animationDelay: `${i * 0.04}s`,
          }}
          title={action.title}
        >
          <span>{action.label}</span>
          <span style={{ fontSize: "10px" }}>{action.title}</span>
        </button>
      ))}

      {/* Snapshot toggle */}
      <button
        onClick={onSnapshot}
        className="quick-btn animate-scale-in ml-auto"
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "12px",
          color: "var(--accent)",
          background: "var(--accent-dim)",
          border: "1px solid rgba(200, 255, 0, 0.2)",
          borderRadius: "6px",
          padding: "3px 8px",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          animationDelay: "0.3s",
        }}
        title="Show Accessibility Tree"
      >
        <span>🌳</span>
        <span style={{ fontSize: "10px" }}>Snapshot</span>
      </button>
    </div>
  );
}
