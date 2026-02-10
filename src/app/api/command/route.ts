import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { command?: string };
    const { command } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    const fullCommand = `agent-browser ${command}`;
    const result = await execAsync(fullCommand, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      {
        stdout: execError.stdout || "",
        stderr: execError.stderr || execError.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
