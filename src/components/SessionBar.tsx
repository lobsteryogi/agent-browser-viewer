"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface SessionInfo {
  id: string;
  name: string;
  source: string;
  status: string;
  created_at: number;
  updated_at: number;
}

interface SessionMeta {
  id: string;
  name: string;
  source: string;
  status: string;
  action_count: number;
}

interface SessionBarProps {
  activeSession: SessionInfo | null;
  sessionsList: SessionMeta[];
  onCreateSession: (name: string) => void;
  onCloseSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onRenameSession: (name: string) => void;
}

export default function SessionBar({
  activeSession,
  sessionsList,
  onCreateSession,
  onCloseSession,
  onSwitchSession,
  onRenameSession,
}: SessionBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (showNewInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewInput]);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateSession(newName.trim());
      setNewName("");
      setShowNewInput(false);
      setShowDropdown(false);
    }
  };

  const handleRename = () => {
    if (editName.trim()) {
      onRenameSession(editName.trim());
      setIsEditing(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 border-b animate-fade-in-up"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-tertiary)",
        minHeight: "32px",
      }}
    >
      {/* Session icon */}
      <span style={{ fontSize: "12px" }}>📂</span>

      {/* Session name or selector */}
      <div className="relative" ref={dropdownRef}>
        {activeSession && !isEditing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
                background: "var(--accent-dim)",
                border: "1px solid rgba(200, 255, 0, 0.15)",
                borderRadius: "4px",
                padding: "2px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s",
              }}
            >
              {activeSession.name}
              <span style={{ fontSize: "8px", opacity: 0.6 }}>▼</span>
            </button>
            <button
              onClick={() => {
                setIsEditing(true);
                setEditName(activeSession.name);
              }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
              }}
              title="Rename session"
            >
              ✏️
            </button>
          </div>
        ) : activeSession && isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRename();
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              autoFocus
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--accent)",
                background: "var(--bg-primary)",
                border: "1px solid var(--accent)",
                borderRadius: "4px",
                padding: "2px 8px",
                outline: "none",
                width: "160px",
              }}
            />
          </form>
        ) : (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "12px",
              color: "var(--text-muted)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "2px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s",
            }}
          >
            No active session
            <span style={{ fontSize: "8px", opacity: 0.6 }}>▼</span>
          </button>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div
            className="absolute top-full left-0 mt-1 z-50 animate-scale-in"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              minWidth: "240px",
              maxHeight: "300px",
              overflow: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* New Session */}
            {showNewInput ? (
              <div className="p-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreate();
                  }}
                  className="flex gap-1"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Session name..."
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--text-primary)",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      outline: "none",
                      flex: 1,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      fontWeight: 600,
                      color: newName.trim() ? "var(--bg-primary)" : "var(--text-muted)",
                      background: newName.trim() ? "var(--accent)" : "var(--bg-tertiary)",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      cursor: newName.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Create
                  </button>
                </form>
              </div>
            ) : (
              <div
                className="px-3 py-2 border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <button
                  onClick={() => setShowNewInput(true)}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--accent)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  + New Session
                </button>
              </div>
            )}

            {/* Session list */}
            {sessionsList.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  if (s.status === "active") {
                    onSwitchSession(s.id);
                  } else {
                    onSwitchSession(s.id);
                  }
                  setShowDropdown(false);
                }}
                style={{
                  padding: "6px 12px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  background:
                    activeSession?.id === s.id ? "var(--accent-dim)" : "transparent",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
                onMouseEnter={(e) => {
                  if (activeSession?.id !== s.id) {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSession?.id !== s.id) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background:
                        s.status === "active"
                          ? "var(--success)"
                          : "var(--text-muted)",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "12px",
                      color:
                        activeSession?.id === s.id
                          ? "var(--accent)"
                          : "var(--text-primary)",
                      fontWeight: activeSession?.id === s.id ? 600 : 400,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    className="ml-auto"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {s.action_count} actions
                  </span>
                </div>
              </div>
            ))}

            {sessionsList.length === 0 && (
              <div
                className="px-3 py-3"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                No sessions yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close session button */}
      {activeSession && (
        <button
          onClick={onCloseSession}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "2px 8px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = "var(--danger)";
            (e.target as HTMLElement).style.borderColor = "var(--danger)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = "var(--text-muted)";
            (e.target as HTMLElement).style.borderColor = "var(--border)";
          }}
          title="Close current session"
        >
          Close Session
        </button>
      )}

      <div className="flex-1" />

      {/* Link to sessions list */}
      <Link
        href="/apps/browser-viewer/sessions"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--text-muted)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.color = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.color = "var(--text-muted)";
        }}
      >
        📚 Sessions History →
      </Link>
    </div>
  );
}
