import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { readFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  createSession,
  getActiveSessionByName,
  insertAction,
  updateAction,
} from "@/lib/db";
import type { Server as SocketIOServer } from "socket.io";

const execAsync = promisify(exec);
const SCREENSHOTS_DIR = path.join(process.cwd(), "data", "screenshots");

interface BrowserState {
  isOpen: boolean;
  currentUrl: string;
  pageTitle: string;
  lastScreenshot: string;
  actions: unknown[];
  snapshotTree: string;
  activeSessionId: string | null;
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

async function takeScreenshotBase64(): Promise<string> {
  const tmpPath = `/tmp/agent-browser-hook-screenshot-${Date.now()}.png`;
  try {
    await executeCommand(`screenshot ${tmpPath}`);
    if (existsSync(tmpPath)) {
      const buffer = await readFile(tmpPath);
      const base64 = buffer.toString("base64");
      execAsync(`rm -f ${tmpPath}`).catch(() => {});
      return `data:image/png;base64,${base64}`;
    }
  } catch {
    // ignore
  }
  return "";
}

async function saveScreenshotFile(
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
    return `${sessionId}/${filename}`;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionName?: string;
      command?: string;
      source?: string;
    };

    const { sessionName, command, source } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "command is required" }, { status: 400 });
    }
    if (!sessionName || typeof sessionName !== "string") {
      return NextResponse.json({ error: "sessionName is required" }, { status: 400 });
    }

    const hookSource = source === "cron" ? "cron" : "chat";

    // Find or create session
    let session = getActiveSessionByName(sessionName);
    if (!session) {
      session = createSession(sessionName, hookSource);
    }

    // Insert action
    const dbAction = insertAction({
      session_id: session.id,
      command,
    });

    // Get IO + State
    const io = (globalThis as Record<string, unknown>).__socketIO as SocketIOServer | undefined;
    const state = (globalThis as Record<string, unknown>).__browserState as BrowserState | undefined;

    // Broadcast action start
    const actionPayload = {
      id: dbAction.id,
      type: command.split(" ")[0],
      command,
      timestamp: dbAction.timestamp,
      session_id: session.id,
    };
    io?.emit("action", actionPayload);

    // Execute command
    const result = await executeCommand(command);
    const stdout = result.stdout || "OK";
    const stderr = result.stderr || undefined;

    // Get current URL/title
    const [urlResult, titleResult] = await Promise.all([
      executeCommand("get url").catch(() => ({ stdout: "", stderr: "" })),
      executeCommand("get title").catch(() => ({ stdout: "", stderr: "" })),
    ]);
    const currentUrl = urlResult.stdout.trim();
    const pageTitle = titleResult.stdout.trim();

    // Update state
    if (state) {
      if (currentUrl && !currentUrl.includes("Error") && !currentUrl.includes("No browser")) {
        state.isOpen = true;
        state.currentUrl = currentUrl;
        state.pageTitle = pageTitle;
      }
      io?.emit("status", {
        isOpen: state.isOpen,
        currentUrl: state.currentUrl,
        pageTitle: state.pageTitle,
      });
    }

    // Screenshot
    const screenshotBase64 = await takeScreenshotBase64();
    let screenshotPath: string | null = null;

    if (screenshotBase64) {
      if (state) {
        state.lastScreenshot = screenshotBase64;
      }
      io?.emit("screenshot", screenshotBase64);
      screenshotPath = await saveScreenshotFile(session.id, screenshotBase64);
    }

    // Update DB
    updateAction(dbAction.id, {
      result: stdout,
      error: stderr ?? null,
      screenshot_path: screenshotPath,
      url: currentUrl || null,
      page_title: pageTitle || null,
    });

    // Broadcast update
    io?.emit("action-update", {
      id: dbAction.id,
      result: stdout,
      error: stderr,
      screenshot_path: screenshotPath,
      url: currentUrl,
      page_title: pageTitle,
    });

    return NextResponse.json({
      ok: true,
      session_id: session.id,
      action_id: dbAction.id,
      result: stdout,
      error: stderr,
      screenshot_path: screenshotPath,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
