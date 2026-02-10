"use client";

interface SnapshotPanelProps {
  tree: string;
  onClose: () => void;
}

export default function SnapshotPanel({ tree, onClose }: SnapshotPanelProps) {
  return (
    <div
      className="snapshot-panel flex flex-col border-l"
      style={{
        width: "340px",
        minWidth: "340px",
        borderColor: "var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-tertiary)",
        }}
      >
        <span style={{ fontSize: "12px" }}>🌳</span>
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
          Accessibility Tree
        </span>
        <button
          onClick={onClose}
          className="ml-auto"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "14px",
            color: "var(--text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = "var(--text-muted)";
          }}
          title="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-3">
        {tree ? (
          <pre
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {tree.split("\n").map((line, i) => {
              // Highlight refs like @e1, @e2
              const refMatch = line.match(/@e\d+/);
              if (refMatch) {
                const parts = line.split(refMatch[0]);
                return (
                  <div key={i}>
                    {parts[0]}
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                      {refMatch[0]}
                    </span>
                    {parts[1]}
                  </div>
                );
              }
              return <div key={i}>{line}</div>;
            })}
          </pre>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: "var(--text-muted)" }}
          >
            <span style={{ fontSize: "20px", opacity: 0.5 }}>🌳</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
              Click &quot;Snapshot&quot; to load
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
