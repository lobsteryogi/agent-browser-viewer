"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ActionRow {
  id: string;
  session_id: string;
  command: string;
  result: string | null;
  error: string | null;
  screenshot_path: string | null;
  url: string | null;
  page_title: string | null;
  timestamp: number;
}

interface SessionData {
  id: string;
  name: string;
  source: string;
  created_at: number;
  updated_at: number;
  status: string;
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

function getEmoji(command: string): string {
  const type = command.split(" ")[0];
  return ACTION_EMOJIS[type] || "▶️";
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  viewer: { label: "VIEWER", color: "var(--accent)" },
  chat: { label: "CHAT", color: "#60a5fa" },
  cron: { label: "CRON", color: "#a78bfa" },
};

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionListRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/apps/browser-viewer/api/sessions/${sessionId}`);
      const data = (await res.json()) as { session: SessionData; actions: ActionRow[] };
      setSession(data.session);
      setActions(data.actions || []);
      // Select first action with screenshot
      const firstWithScreenshot = data.actions?.find((a: ActionRow) => a.screenshot_path);
      if (firstWithScreenshot) {
        setSelectedAction(firstWithScreenshot);
      } else if (data.actions?.length) {
        setSelectedAction(data.actions[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-play
  useEffect(() => {
    if (autoPlaying && actions.length > 0) {
      autoPlayRef.current = setInterval(() => {
        setAutoPlayIndex((prev) => {
          const next = prev + 1;
          if (next >= actions.length) {
            setAutoPlaying(false);
            return prev;
          }
          setSelectedAction(actions[next]);
          return next;
        });
      }, 1500);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [autoPlaying, actions]);

  const toggleAutoPlay = () => {
    if (autoPlaying) {
      setAutoPlaying(false);
    } else {
      const currentIdx = selectedAction
        ? actions.findIndex((a) => a.id === selectedAction.id)
        : -1;
      setAutoPlayIndex(currentIdx >= 0 ? currentIdx : 0);
      if (currentIdx < 0 && actions.length > 0) {
        setSelectedAction(actions[0]);
      }
      setAutoPlaying(true);
    }
  };

  // Scroll selected action into view
  useEffect(() => {
    if (selectedAction && actionListRef.current) {
      const el = actionListRef.current.querySelector(
        `[data-action-id="${selectedAction.id}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedAction]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}
      >
        <div
          className="loading-shimmer"
          style={{ width: 200, height: 20, borderRadius: 6 }}
        />
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-3"
        style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}
      >
        <span style={{ fontSize: "32px" }}>😵</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "16px" }}>
          Session not found
        </span>
        <Link
          href="/apps/browser-viewer/sessions"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          ← Back to sessions
        </Link>
      </div>
    );
  }

  const badge = SOURCE_BADGES[session.source] ?? {
    label: session.source.toUpperCase(),
    color: "var(--text-muted)",
  };

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b animate-fade-in-up"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-secondary)",
        }}
      >
        <Link
          href="/apps/browser-viewer/sessions"
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
          ← Sessions
        </Link>

        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {session.name}
        </span>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            fontWeight: 600,
            color: badge.color,
            background: "var(--bg-elevated)",
            padding: "1px 6px",
            borderRadius: "3px",
            letterSpacing: "0.05em",
          }}
        >
          {badge.label}
        </span>

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

        <div className="flex-1" />

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-muted)",
          }}
        >
          {formatDate(session.created_at)}
        </span>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-muted)",
          }}
        >
          {actions.length} actions
        </span>

        {/* Auto-play */}
        <button
          onClick={toggleAutoPlay}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 600,
            color: autoPlaying ? "var(--bg-primary)" : "var(--accent)",
            background: autoPlaying ? "var(--accent)" : "var(--accent-dim)",
            border: autoPlaying
              ? "1px solid var(--accent)"
              : "1px solid rgba(200, 255, 0, 0.2)",
            borderRadius: "6px",
            padding: "4px 12px",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {autoPlaying ? "⏸ Pause" : "▶ Auto-play"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Action Log */}
        <div
          ref={actionListRef}
          className="flex flex-col border-r animate-fade-in-up"
          style={{
            width: "300px",
            minWidth: "300px",
            borderColor: "var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          {/* Action list header */}
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

          {/* Actions */}
          <div className="flex-1 overflow-y-auto p-1">
            {actions.length === 0 && (
              <div
                className="flex flex-col items-center justify-center h-full gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <span style={{ fontSize: "24px", opacity: 0.5 }}>📭</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "12px" }}>
                  No actions recorded
                </span>
              </div>
            )}

            {actions.map((action, index) => {
              const isSelected = selectedAction?.id === action.id;
              return (
                <div
                  key={action.id}
                  data-action-id={action.id}
                  className="action-item px-2 py-1.5 mx-1 mb-0.5 rounded border-l-2"
                  onClick={() => {
                    setSelectedAction(action);
                    if (autoPlaying) {
                      setAutoPlaying(false);
                    }
                  }}
                  style={{
                    borderLeftColor: isSelected
                      ? "var(--accent)"
                      : action.error
                      ? "var(--danger)"
                      : action.result
                      ? "var(--border)"
                      : "var(--border)",
                    background: isSelected ? "var(--bg-elevated)" : undefined,
                    cursor: "pointer",
                    animationDelay: `${Math.min(index * 0.02, 0.3)}s`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: "12px" }}>{getEmoji(action.command)}</span>
                    <span
                      className="truncate flex-1"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: isSelected
                          ? "var(--accent)"
                          : "var(--text-primary)",
                      }}
                      title={action.command}
                    >
                      {action.command}
                    </span>
                    {action.screenshot_path && (
                      <span style={{ fontSize: "10px", opacity: 0.5 }}>📸</span>
                    )}
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
                    {action.url && (
                      <span
                        className="truncate"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "9px",
                          color: "var(--text-muted)",
                          maxWidth: "120px",
                        }}
                        title={action.url}
                      >
                        {action.url.replace(/^https?:\/\//, "").slice(0, 30)}
                      </span>
                    )}
                    {action.error && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "9px",
                          color: "var(--danger)",
                        }}
                      >
                        ✗
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Screenshot + Details */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Screenshot */}
          <div
            className="flex-1 min-h-0 flex items-center justify-center"
            style={{ background: "var(--bg-primary)", padding: "8px" }}
          >
            {selectedAction?.screenshot_path ? (
              <img
                src={`/apps/browser-viewer/api/screenshots/${selectedAction.screenshot_path}`}
                alt="Action screenshot"
                className="animate-scale-in"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                }}
                key={selectedAction.id}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <span style={{ fontSize: "32px", opacity: 0.3 }}>📸</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                  {selectedAction
                    ? "No screenshot for this action"
                    : "Select an action to view screenshot"}
                </span>
              </div>
            )}
          </div>

          {/* Action details bar */}
          {selectedAction && (
            <div
              className="border-t px-4 py-2"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-secondary)",
              }}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "14px" }}>
                  {getEmoji(selectedAction.command)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "var(--accent)",
                  }}
                >
                  {selectedAction.command}
                </span>
                <div className="flex-1" />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  {formatTime(selectedAction.timestamp)}
                </span>
              </div>
              {selectedAction.url && (
                <div
                  className="mt-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  🔗 {selectedAction.url}
                </div>
              )}
              {selectedAction.page_title && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  📄 {selectedAction.page_title}
                </div>
              )}
              {selectedAction.error && (
                <div
                  className="mt-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--danger)",
                    maxHeight: "40px",
                    overflow: "auto",
                  }}
                >
                  ✗ {selectedAction.error}
                </div>
              )}
              {selectedAction.result && !selectedAction.error && (
                <div
                  className="mt-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--success)",
                    maxHeight: "40px",
                    overflow: "auto",
                  }}
                >
                  ✓ {selectedAction.result.slice(0, 200)}
                </div>
              )}
            </div>
          )}

          {/* Navigation bar */}
          {actions.length > 0 && (
            <div
              className="border-t px-4 py-1.5 flex items-center gap-2 justify-center"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-tertiary)",
              }}
            >
              <button
                onClick={() => {
                  const idx = actions.findIndex(
                    (a) => a.id === selectedAction?.id
                  );
                  if (idx > 0) {
                    setSelectedAction(actions[idx - 1]);
                  }
                }}
                disabled={
                  !selectedAction ||
                  actions.findIndex((a) => a.id === selectedAction?.id) <= 0
                }
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "2px 10px",
                  cursor: "pointer",
                  opacity:
                    !selectedAction ||
                    actions.findIndex((a) => a.id === selectedAction?.id) <= 0
                      ? 0.3
                      : 1,
                }}
              >
                ← Prev
              </button>

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  minWidth: "60px",
                  textAlign: "center",
                }}
              >
                {selectedAction
                  ? `${actions.findIndex((a) => a.id === selectedAction.id) + 1} / ${actions.length}`
                  : `— / ${actions.length}`}
              </span>

              <button
                onClick={() => {
                  const idx = actions.findIndex(
                    (a) => a.id === selectedAction?.id
                  );
                  if (idx < actions.length - 1) {
                    setSelectedAction(actions[idx + 1]);
                  }
                }}
                disabled={
                  !selectedAction ||
                  actions.findIndex((a) => a.id === selectedAction?.id) >=
                    actions.length - 1
                }
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "2px 10px",
                  cursor: "pointer",
                  opacity:
                    !selectedAction ||
                    actions.findIndex((a) => a.id === selectedAction?.id) >=
                      actions.length - 1
                      ? 0.3
                      : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
