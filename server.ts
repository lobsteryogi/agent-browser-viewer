import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import {
  getDb,
  createSession,
  insertAction,
  updateAction,
  updateSession,
  getActiveSessionByName,
  getSession,
  listSessions,
  getSessionActions,
  type SessionRow,
  type ActionRow,
} from "./src/lib/db.js";

const execAsync = promisify(exec);
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = 3458;

const SCREENSHOTS_DIR = path.join(process.cwd(), "data", "screenshots");

interface ActionEntry {
  id: string;
  type: string;
  command: string;
  timestamp: number;
  result?: string;
  error?: string;
  screenshot_path?: string;
  url?: string;
  page_title?: string;
  session_id?: string;
  nlpOriginal?: string;
}

interface BrowserState {
  isOpen: boolean;
  currentUrl: string;
  pageTitle: string;
  lastScreenshot: string;
  actions: ActionEntry[];
  snapshotTree: string;
  activeSessionId: string | null;
}

const state: BrowserState = {
  isOpen: false,
  currentUrl: "",
  pageTitle: "",
  lastScreenshot: "",
  actions: [],
  snapshotTree: "",
  activeSessionId: null,
};

async function executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  const fullCommand = `agent-browser ${command}`;
  try {
    const result = await execAsync(fullCommand, {
      timeout: 30000,
      maxBuffer: 50 * 1024 * 1024,
    });
    return result;
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      stdout: execError.stdout || "",
      stderr: execError.stderr || execError.message || "Unknown error",
    };
  }
}

async function takeScreenshot(): Promise<string> {
  const tmpPath = `/tmp/agent-browser-screenshot-${Date.now()}.png`;
  try {
    await executeCommand(`screenshot ${tmpPath}`);
    if (existsSync(tmpPath)) {
      const buffer = await readFile(tmpPath);
      const base64 = buffer.toString("base64");
      execAsync(`rm -f ${tmpPath}`).catch(() => {});
      return `data:image/png;base64,${base64}`;
    }
  } catch {
    // Ignore screenshot errors
  }
  return "";
}

async function saveScreenshotToFile(
  sessionId: string,
  base64Data: string
): Promise<string | null> {
  if (!base64Data || !base64Data.startsWith("data:image")) return null;

  try {
    const dir = path.join(SCREENSHOTS_DIR, sessionId);
    await mkdir(dir, { recursive: true });

    const timestamp = Date.now();
    const filename = `${timestamp}.png`;
    const filePath = path.join(dir, filename);

    const raw = base64Data.replace(/^data:image\/\w+;base64,/, "");
    await writeFile(filePath, Buffer.from(raw, "base64"));

    // Return relative path for DB storage
    return `${sessionId}/${filename}`;
  } catch {
    return null;
  }
}

async function updateBrowserState(): Promise<void> {
  try {
    const [urlResult, titleResult] = await Promise.all([
      executeCommand("get url").catch(() => ({ stdout: "", stderr: "" })),
      executeCommand("get title").catch(() => ({ stdout: "", stderr: "" })),
    ]);

    const url = urlResult.stdout.trim();
    const title = titleResult.stdout.trim();

    if (url && !url.includes("Error") && !url.includes("No browser")) {
      state.isOpen = true;
      state.currentUrl = url;
      state.pageTitle = title;
    } else {
      state.isOpen = false;
    }
  } catch {
    state.isOpen = false;
  }
}

async function getSnapshot(): Promise<string> {
  try {
    const result = await executeCommand("snapshot -i -c");
    return result.stdout || "";
  } catch {
    return "";
  }
}

async function main() {
  // Initialize DB
  getDb();

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/apps/browser-viewer/socket.io",
    cors: { origin: "*" },
    maxHttpBufferSize: 50 * 1024 * 1024,
  });

  // Store on global for API routes
  (globalThis as Record<string, unknown>).__socketIO = io;
  (globalThis as Record<string, unknown>).__browserState = state;

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Send current state
    socket.emit("status", {
      isOpen: state.isOpen,
      currentUrl: state.currentUrl,
      pageTitle: state.pageTitle,
    });

    if (state.lastScreenshot) {
      socket.emit("screenshot", state.lastScreenshot);
    }

    // Send active session info
    if (state.activeSessionId) {
      const session = getSession(state.activeSessionId);
      if (session) {
        socket.emit("session-info", session);
      }
    }

    // Send sessions list
    socket.emit("sessions-list", listSessions());

    // Send action history
    state.actions.forEach((action) => {
      socket.emit("action", action);
    });

    // ── Session management ──

    socket.on("create-session", (data: { name: string }) => {
      const session = createSession(data.name, "viewer");
      state.activeSessionId = session.id;
      state.actions = [];
      io.emit("session-info", session);
      io.emit("sessions-list", listSessions());
      io.emit("actions-clear");
    });

    socket.on("close-session", () => {
      if (state.activeSessionId) {
        updateSession(state.activeSessionId, { status: "closed" });
        const session = getSession(state.activeSessionId);
        state.activeSessionId = null;
        if (session) {
          io.emit("session-info", null);
        }
        io.emit("sessions-list", listSessions());
      }
    });

    socket.on("switch-session", (sessionId: string) => {
      const session = getSession(sessionId);
      if (session) {
        state.activeSessionId = session.id;
        // Load actions from DB
        const dbActions = getSessionActions(session.id);
        state.actions = dbActions.map((a) => ({
          id: a.id,
          type: a.command.split(" ")[0],
          command: a.command,
          timestamp: a.timestamp,
          result: a.result ?? undefined,
          error: a.error ?? undefined,
          screenshot_path: a.screenshot_path ?? undefined,
          url: a.url ?? undefined,
          page_title: a.page_title ?? undefined,
          session_id: a.session_id,
        }));
        io.emit("session-info", session);
        io.emit("actions-clear");
        state.actions.forEach((action) => {
          io.emit("action", action);
        });
      }
    });

    socket.on("rename-session", (data: { name: string }) => {
      if (state.activeSessionId) {
        updateSession(state.activeSessionId, { name: data.name });
        const session = getSession(state.activeSessionId);
        if (session) {
          io.emit("session-info", session);
          io.emit("sessions-list", listSessions());
        }
      }
    });

    // ── Command execution ──

    socket.on("command", async (command: string, nlpOriginal?: string) => {
      const actionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const action: ActionEntry = {
        id: actionId,
        type: command.split(" ")[0],
        command,
        timestamp: Date.now(),
        session_id: state.activeSessionId ?? undefined,
        nlpOriginal: nlpOriginal ?? undefined,
      };

      // Broadcast action start
      io.emit("action", action);
      state.actions.push(action);
      if (state.actions.length > 200) {
        state.actions = state.actions.slice(-200);
      }

      // Insert action into DB if session is active
      let dbActionId: string | null = null;
      if (state.activeSessionId) {
        const dbAction = insertAction({
          session_id: state.activeSessionId,
          command,
        });
        dbActionId = dbAction.id;
        action.id = dbAction.id; // Use DB id
      }

      try {
        const result = await executeCommand(command);
        action.result = result.stdout || "OK";
        if (result.stderr) {
          action.error = result.stderr;
        }

        // Update state
        await updateBrowserState();

        io.emit("status", {
          isOpen: state.isOpen,
          currentUrl: state.currentUrl,
          pageTitle: state.pageTitle,
        });

        // Take screenshot
        const screenshot = await takeScreenshot();
        let screenshotPath: string | null = null;

        if (screenshot) {
          state.lastScreenshot = screenshot;
          io.emit("screenshot", screenshot);

          // Save to file if session active
          if (state.activeSessionId) {
            screenshotPath = await saveScreenshotToFile(state.activeSessionId, screenshot);
          }
        }

        // Update DB action
        if (dbActionId && state.activeSessionId) {
          updateAction(dbActionId, {
            result: action.result,
            error: action.error ?? null,
            screenshot_path: screenshotPath,
            url: state.currentUrl || null,
            page_title: state.pageTitle || null,
          });
        }

        // Emit action update
        io.emit("action-update", {
          id: action.id,
          result: action.result,
          error: action.error,
          screenshot_path: screenshotPath,
          url: state.currentUrl,
          page_title: state.pageTitle,
        });
      } catch (error: unknown) {
        const err = error as Error;
        action.error = err.message;

        if (dbActionId) {
          updateAction(dbActionId, { error: err.message });
        }

        io.emit("action-update", { id: action.id, error: err.message });
      }
    });

    // Handle snapshot request
    socket.on("snapshot-request", async () => {
      const tree = await getSnapshot();
      state.snapshotTree = tree;
      socket.emit("snapshot", tree);
    });

    // Handle mouse click on screenshot
    socket.on("click-at", async (data: { x: number; y: number }) => {
      const { x, y } = data;
      const actionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const action: ActionEntry = {
        id: actionId,
        type: "click",
        command: `mouse move ${x} ${y} && click`,
        timestamp: Date.now(),
        session_id: state.activeSessionId ?? undefined,
      };

      io.emit("action", action);
      state.actions.push(action);

      let dbActionId: string | null = null;
      if (state.activeSessionId) {
        const dbAction = insertAction({
          session_id: state.activeSessionId,
          command: action.command,
        });
        dbActionId = dbAction.id;
        action.id = dbAction.id;
      }

      await executeCommand(`mouse move ${x} ${y}`);
      await executeCommand(`mouse down`);
      await executeCommand(`mouse up`);
      // Wait a bit for page to react
      await new Promise((r) => setTimeout(r, 500));
      await updateBrowserState();
      io.emit("status", {
        isOpen: state.isOpen,
        currentUrl: state.currentUrl,
        pageTitle: state.pageTitle,
      });

      const screenshot = await takeScreenshot();
      let screenshotPath: string | null = null;
      if (screenshot) {
        state.lastScreenshot = screenshot;
        io.emit("screenshot", screenshot);
        if (state.activeSessionId) {
          screenshotPath = await saveScreenshotToFile(state.activeSessionId, screenshot);
        }
      }

      if (dbActionId) {
        updateAction(dbActionId, {
          result: "OK",
          screenshot_path: screenshotPath,
          url: state.currentUrl || null,
          page_title: state.pageTitle || null,
        });
      }

      action.result = "OK";
      io.emit("action-update", {
        id: action.id,
        result: "OK",
        screenshot_path: screenshotPath,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  // Initial state check
  updateBrowserState().then(async () => {
    if (state.isOpen) {
      const screenshot = await takeScreenshot();
      if (screenshot) {
        state.lastScreenshot = screenshot;
      }
    }
  });

  httpServer.listen(port, hostname, () => {
    console.log(`\n  ⚡ Agent Browser Viewer V2 running at http://${hostname}:${port}\n`);
  });
}

main().catch(console.error);
