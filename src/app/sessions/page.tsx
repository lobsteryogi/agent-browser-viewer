"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface SessionMeta {
  id: string;
  name: string;
  source: string;
  created_at: number;
  updated_at: number;
  status: string;
  action_count: number;
  last_screenshot: string | null;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(start: number, end: number): string {
  const diff = end - start;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  viewer: { label: "VIEWER", color: "var(--accent)" },
  chat: { label: "CHAT", color: "#60a5fa" },
  cron: { label: "CRON", color: "#a78bfa" },
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const q = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/apps/browser-viewer/api/sessions${q}`);
      const data = (await res.json()) as { sessions: SessionMeta[] };
      setSessions(data.sessions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this session and all screenshots?")) return;
    await fetch(`/apps/browser-viewer/api/sessions/${id}`, { method: "DELETE" });
    fetchSessions();
  };

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-secondary)",
        }}
      >
        <Link
          href="/apps/browser-viewer"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-muted)",
            textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          ← Live Viewer
        </Link>

        <div className="flex items-center gap-2">
          <span style={{ fontSize: "14px" }}>📚</span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Sessions
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
              background: "var(--bg-elevated)",
              padding: "1px 8px",
              borderRadius: "4px",
            }}
          >
            {sessions.length}
          </span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sessions..."
          className="command-input"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-primary)",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "5px 12px",
            outline: "none",
            width: "260px",
          }}
        />
      </div>

      {/* Sessions Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: "var(--text-muted)" }}
          >
            <div className="loading-shimmer" style={{ width: 200, height: 20, borderRadius: 6 }} />
          </div>
        ) : sessions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-3"
            style={{ color: "var(--text-muted)" }}
          >
            <span style={{ fontSize: "32px", opacity: 0.4 }}>📚</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "14px" }}>
              {searchQuery ? "No sessions found" : "No sessions yet"}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
              {searchQuery
                ? "Try a different search query"
                : "Create a session from the live viewer or via the hook API"}
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "12px",
            }}
          >
            {sessions.map((session, i) => (
              <Link
                key={session.id}
                href={`/apps/browser-viewer/sessions/${session.id}`}
                className="animate-fade-in-up"
                style={{
                  textDecoration: "none",
                  animationDelay: `${Math.min(i * 0.04, 0.4)}s`,
                }}
              >
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    transition: "border-color 0.2s, transform 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      height: "140px",
                      background: "var(--bg-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {session.last_screenshot ? (
                      <img
                        src={`/apps/browser-viewer/api/screenshots/${session.last_screenshot}`}
                        alt="Session thumbnail"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.8,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "32px",
                          opacity: 0.3,
                        }}
                      >
                        🖥️
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {session.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "9px",
                          fontWeight: 600,
                          color: SOURCE_BADGES[session.source]?.color ?? "var(--text-muted)",
                          background: "var(--bg-elevated)",
                          padding: "1px 6px",
                          borderRadius: "3px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {SOURCE_BADGES[session.source]?.label ?? session.source.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {/* Status */}
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color:
                            session.status === "active"
                              ? "var(--success)"
                              : "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <span
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            background:
                              session.status === "active"
                                ? "var(--success)"
                                : "var(--text-muted)",
                            display: "inline-block",
                          }}
                        />
                        {session.status}
                      </span>

                      {/* Actions count */}
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {session.action_count} actions
                      </span>

                      {/* Duration */}
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {formatDuration(session.created_at, session.updated_at)}
                      </span>

                      <div className="flex-1" />

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "2px 4px",
                          borderRadius: "3px",
                          transition: "color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.color = "var(--danger)";
                          (e.target as HTMLElement).style.background = "rgba(255,68,68,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.color = "var(--text-muted)";
                          (e.target as HTMLElement).style.background = "none";
                        }}
                        title="Delete session"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Date */}
                    <div
                      className="mt-1"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {formatDate(session.created_at)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
