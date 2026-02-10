import { NextResponse } from "next/server";
import { getSession, updateSession, deleteSession, getSessionActions } from "@/lib/db";
import { rm } from "fs/promises";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSession(id);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const actions = getSessionActions(id);

    return NextResponse.json({ session, actions });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { name?: string; status?: string };

    const updated = updateSession(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = getSession(id);
    return NextResponse.json({ session });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete screenshots directory
    const screenshotDir = path.join(process.cwd(), "data", "screenshots", id);
    try {
      await rm(screenshotDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }

    const deleted = deleteSession(id);
    if (!deleted) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
