"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface CommandInputProps {
  onSubmit: (command: string, nlpOriginal?: string) => void;
  isExecuting: boolean;
  snapshotTree?: string;
}

const KNOWN_COMMANDS = [
  "open", "click", "dblclick", "fill", "type", "screenshot", "scroll",
  "hover", "press", "select", "snapshot", "reload", "back", "forward",
  "close", "eval", "wait", "drag", "focus", "check", "uncheck", "mouse",
  "get", "find", "tap", "swipe",
];

function isDirectCommand(input: string): boolean {
  const firstWord = input.trim().split(/\s+/)[0].toLowerCase();
  return KNOWN_COMMANDS.includes(firstWord);
}

export default function CommandInput({ onSubmit, isExecuting, snapshotTree }: CommandInputProps) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [translating, setTranslating] = useState(false);
  const [lastTranslation, setLastTranslation] = useState<{
    original: string;
    command: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDirect = !command.trim() || isDirectCommand(command.trim());

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const input = command.trim();
      if (!input || isExecuting || translating) return;

      setHistory((prev) => [...prev, input]);
      setCommand("");
      setHistoryIndex(-1);

      if (isDirectCommand(input)) {
        // Direct command — send immediately
        setLastTranslation(null);
        onSubmit(input);
      } else {
        // NLP — translate via AI
        setTranslating(true);
        setLastTranslation(null);
        try {
          const res = await fetch("/apps/browser-viewer/api/nlp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input,
              snapshot: snapshotTree || undefined,
            }),
          });
          const data = (await res.json()) as {
            type: string;
            command: string;
            original?: string;
            error?: string;
          };

          if (data.error) {
            setLastTranslation({
              original: input,
              command: `❌ Error: ${data.error}`,
            });
            setTranslating(false);
            return;
          }

          setLastTranslation({
            original: data.original || input,
            command: data.command,
          });
          setTranslating(false);
          // Auto-execute the translated command
          onSubmit(data.command, data.original || input);
        } catch (err) {
          setLastTranslation({
            original: input,
            command: `❌ Translation failed: ${(err as Error).message}`,
          });
          setTranslating(false);
        }
      }
    },
    [command, isExecuting, translating, onSubmit, snapshotTree]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length > 0) {
          const newIndex =
            historyIndex === -1
              ? history.length - 1
              : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          setCommand(history[newIndex]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex !== -1) {
          const newIndex = historyIndex + 1;
          if (newIndex >= history.length) {
            setHistoryIndex(-1);
            setCommand("");
          } else {
            setHistoryIndex(newIndex);
            setCommand(history[newIndex]);
          }
        }
      }
    },
    [history, historyIndex]
  );

  // Focus on / key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div>
      {/* Translation indicator */}
      {(lastTranslation || translating) && (
        <div
          className="px-3 py-1.5 flex items-center gap-2"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-tertiary)",
          }}
        >
          {translating ? (
            <>
              <span style={{ fontSize: "12px" }}>🧠</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                Translating...
              </span>
            </>
          ) : lastTranslation ? (
            <>
              <span style={{ fontSize: "12px" }}>🧠</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--text-muted)",
                }}
              >
                &ldquo;{lastTranslation.original}&rdquo;
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--text-muted)",
                }}
              >
                →
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: lastTranslation.command.startsWith("❌")
                    ? "var(--danger)"
                    : "var(--accent)",
                  fontWeight: 600,
                }}
              >
                {lastTranslation.command}
              </span>
            </>
          ) : null}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2"
      >
        {/* Mode indicator */}
        <span
          title={isDirect ? "Direct command" : "AI-translated (NLP)"}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: isDirect ? "var(--accent)" : "#a78bfa",
            fontWeight: 600,
            cursor: "help",
            minWidth: "18px",
            textAlign: "center",
          }}
        >
          {isDirect ? "⚡" : "🧠"}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Command or natural language... (e.g. "ไปเว็บ google")  Press "/" to focus'
          disabled={isExecuting || translating}
          className="command-input flex-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-primary)",
            background: "var(--bg-tertiary)",
            border: `1px solid ${isDirect ? "var(--border)" : "rgba(167, 139, 250, 0.3)"}`,
            borderRadius: "6px",
            padding: "6px 12px",
            outline: "none",
            opacity: isExecuting || translating ? 0.6 : 1,
            transition: "border-color 0.2s",
          }}
        />
        <button
          type="submit"
          disabled={isExecuting || translating || !command.trim()}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 600,
            color: isExecuting || translating || !command.trim() ? "var(--text-muted)" : "var(--bg-primary)",
            background:
              isExecuting || translating || !command.trim() ? "var(--bg-elevated)" : isDirect ? "var(--accent)" : "#a78bfa",
            border: "none",
            borderRadius: "6px",
            padding: "6px 14px",
            cursor: isExecuting || translating || !command.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {translating ? "🧠" : isExecuting ? "⏳" : isDirect ? "Run" : "Ask AI"}
        </button>
      </form>
    </div>
  );
}
