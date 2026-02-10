"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import ActionLog from "@/components/ActionLog";
import ScreenshotViewer from "@/components/ScreenshotViewer";
import URLBar from "@/components/URLBar";
import CommandInput from "@/components/CommandInput";
import QuickActions from "@/components/QuickActions";
import StatusBar from "@/components/StatusBar";
import SnapshotPanel from "@/components/SnapshotPanel";

interface ActionEntry {
  id: string;
  type: string;
  command: string;
  timestamp: number;
  result?: string;
  error?: string;
}

interface BrowserStatus {
  isOpen: boolean;
  currentUrl: string;
  pageTitle: string;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [screenshot, setScreenshot] = useState<string>("");
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [status, setStatus] = useState<BrowserStatus>({
    isOpen: false,
    currentUrl: "",
    pageTitle: "",
  });
  const [snapshotTree, setSnapshotTree] = useState<string>("");
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const lastActionTime = useRef<number>(0);

  useEffect(() => {
    const s = io({ transports: ["websocket", "polling"] });

    s.on("connect", () => {
      setConnected(true);
    });

    s.on("disconnect", () => {
      setConnected(false);
    });

    s.on("screenshot", (data: string) => {
      setScreenshot(data);
      setIsExecuting(false);
    });

    s.on("status", (data: BrowserStatus) => {
      setStatus(data);
    });

    s.on("action", (action: ActionEntry) => {
      setActions((prev) => {
        // Avoid duplicates
        if (prev.find((a) => a.id === action.id)) return prev;
        return [...prev, action];
      });
      lastActionTime.current = action.timestamp;
      setIsExecuting(true);
    });

    s.on("action-update", (update: { id: string; result?: string; error?: string }) => {
      setActions((prev) =>
        prev.map((a) =>
          a.id === update.id
            ? { ...a, result: update.result, error: update.error }
            : a
        )
      );
      setIsExecuting(false);
    });

    s.on("snapshot", (tree: string) => {
      setSnapshotTree(tree);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const sendCommand = useCallback(
    (command: string) => {
      if (socket && command.trim()) {
        socket.emit("command", command.trim());
      }
    },
    [socket]
  );

  const requestSnapshot = useCallback(() => {
    if (socket) {
      socket.emit("snapshot-request");
      setShowSnapshot(true);
    }
  }, [socket]);

  const handleClickAt = useCallback(
    (x: number, y: number) => {
      if (socket) {
        socket.emit("click-at", { x, y });
      }
    },
    [socket]
  );

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* URL Bar */}
      <URLBar
        url={status.currentUrl}
        title={status.pageTitle}
        isOpen={status.isOpen}
        onNavigate={(url) => sendCommand(`open ${url}`)}
      />

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Action Log */}
        <div
          className="flex flex-col border-r animate-fade-in-up"
          style={{
            width: "280px",
            minWidth: "280px",
            borderColor: "var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          <ActionLog actions={actions} />
        </div>

        {/* Center - Screenshot */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 relative">
            <ScreenshotViewer
              screenshot={screenshot}
              isExecuting={isExecuting}
              onClickAt={handleClickAt}
            />
          </div>

          {/* Quick Actions + Command Input */}
          <div
            className="border-t"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-secondary)",
            }}
          >
            <QuickActions
              onCommand={sendCommand}
              onSnapshot={requestSnapshot}
            />
            <CommandInput onSubmit={sendCommand} isExecuting={isExecuting} />
          </div>
        </div>

        {/* Right Panel - Snapshot Tree (toggle) */}
        {showSnapshot && (
          <SnapshotPanel
            tree={snapshotTree}
            onClose={() => setShowSnapshot(false)}
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        connected={connected}
        isOpen={status.isOpen}
        lastActionTime={lastActionTime.current}
        actionsCount={actions.length}
      />
    </div>
  );
}
