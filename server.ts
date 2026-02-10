import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = 3458;

interface ActionEntry {
  id: string;
  type: string;
  command: string;
  timestamp: number;
  result?: string;
  error?: string;
}

interface BrowserState {
  isOpen: boolean;
  currentUrl: string;
  pageTitle: string;
  lastScreenshot: string;
  actions: ActionEntry[];
  snapshotTree: string;
}

const state: BrowserState = {
  isOpen: false,
  currentUrl: "",
  pageTitle: "",
  lastScreenshot: "",
  actions: [],
  snapshotTree: "",
};

function getActionEmoji(command: string): string {
  const cmd = command.toLowerCase().trim();
  if (cmd.startsWith("open")) return "🌐";
  if (cmd.startsWith("click")) return "👆";
  if (cmd.startsWith("dblclick")) return "👆👆";
  if (cmd.startsWith("fill") || cmd.startsWith("type")) return "⌨️";
  if (cmd.startsWith("screenshot")) return "📸";
  if (cmd.startsWith("scroll")) return "📜";
  if (cmd.startsWith("hover")) return "🎯";
  if (cmd.startsWith("press")) return "⌨️";
  if (cmd.startsWith("select")) return "📋";
  if (cmd.startsWith("snapshot")) return "🌳";
  if (cmd.startsWith("reload") || cmd.startsWith("refresh")) return "🔄";
  if (cmd.startsWith("back")) return "⬅️";
  if (cmd.startsWith("forward")) return "➡️";
  if (cmd.startsWith("close")) return "🚪";
  if (cmd.startsWith("eval")) return "⚡";
  if (cmd.startsWith("wait")) return "⏳";
  if (cmd.startsWith("drag")) return "🖱️";
  if (cmd.startsWith("focus")) return "🔍";
  if (cmd.startsWith("check") || cmd.startsWith("uncheck")) return "☑️";
  return "▶️";
}

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
      // Clean up
      execAsync(`rm -f ${tmpPath}`).catch(() => {});
      return `data:image/png;base64,${base64}`;
    }
  } catch {
    // Ignore screenshot errors
  }
  return "";
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
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    maxHttpBufferSize: 50 * 1024 * 1024,
  });

  // Store io on global for API routes
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

    // Send action history
    state.actions.forEach((action) => {
      socket.emit("action", action);
    });

    // Handle command execution
    socket.on("command", async (command: string) => {
      const actionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const action: ActionEntry = {
        id: actionId,
        type: command.split(" ")[0],
        command,
        timestamp: Date.now(),
      };

      // Broadcast action start
      io.emit("action", action);
      state.actions.push(action);
      if (state.actions.length > 200) {
        state.actions = state.actions.slice(-200);
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

        // Take screenshot after action (unless the command IS screenshot)
        if (!command.startsWith("screenshot")) {
          const screenshot = await takeScreenshot();
          if (screenshot) {
            state.lastScreenshot = screenshot;
            io.emit("screenshot", screenshot);
          }
        } else if (command.startsWith("screenshot")) {
          // For screenshot command, also grab and send it
          const screenshot = await takeScreenshot();
          if (screenshot) {
            state.lastScreenshot = screenshot;
            io.emit("screenshot", screenshot);
          }
        }

        // Update action with result
        io.emit("action-update", { id: actionId, result: action.result, error: action.error });
      } catch (error: unknown) {
        const err = error as Error;
        action.error = err.message;
        io.emit("action-update", { id: actionId, error: err.message });
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
      };

      io.emit("action", action);
      state.actions.push(action);

      await executeCommand(`eval "await page.mouse.move(${x}, ${y})"`);
      await executeCommand(`eval "await page.mouse.click(${x}, ${y})"`);

      await updateBrowserState();
      io.emit("status", {
        isOpen: state.isOpen,
        currentUrl: state.currentUrl,
        pageTitle: state.pageTitle,
      });

      const screenshot = await takeScreenshot();
      if (screenshot) {
        state.lastScreenshot = screenshot;
        io.emit("screenshot", screenshot);
      }

      action.result = "OK";
      io.emit("action-update", { id: actionId, result: "OK" });
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
    console.log(`\n  ⚡ Agent Browser Viewer running at http://${hostname}:${port}\n`);
  });
}

main().catch(console.error);
