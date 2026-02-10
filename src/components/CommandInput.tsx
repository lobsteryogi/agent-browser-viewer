"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface CommandInputProps {
  onSubmit: (command: string) => void;
  isExecuting: boolean;
}

export default function CommandInput({ onSubmit, isExecuting }: CommandInputProps) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (command.trim() && !isExecuting) {
        onSubmit(command.trim());
        setHistory((prev) => [...prev, command.trim()]);
        setCommand("");
        setHistoryIndex(-1);
      }
    },
    [command, isExecuting, onSubmit]
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
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-2"
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--accent)",
          fontWeight: 600,
        }}
      >
        $
      </span>
      <input
        ref={inputRef}
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='agent-browser command... (e.g. open https://google.com)  Press "/" to focus'
        disabled={isExecuting}
        className="command-input flex-1"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--text-primary)",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "6px 12px",
          outline: "none",
          opacity: isExecuting ? 0.6 : 1,
        }}
      />
      <button
        type="submit"
        disabled={isExecuting || !command.trim()}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          fontWeight: 600,
          color: isExecuting || !command.trim() ? "var(--text-muted)" : "var(--bg-primary)",
          background:
            isExecuting || !command.trim() ? "var(--bg-elevated)" : "var(--accent)",
          border: "none",
          borderRadius: "6px",
          padding: "6px 14px",
          cursor: isExecuting || !command.trim() ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {isExecuting ? "⏳" : "Run"}
      </button>
    </form>
  );
}
