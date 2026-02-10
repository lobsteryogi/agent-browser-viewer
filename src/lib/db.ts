import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "viewer.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'viewer',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      command TEXT NOT NULL,
      result TEXT,
      error TEXT,
      screenshot_path TEXT,
      url TEXT,
      page_title TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_actions_session ON actions(session_id);
    CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON actions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
  `);
}

// ── Session operations ──

export interface SessionRow {
  id: string;
  name: string;
  source: string;
  created_at: number;
  updated_at: number;
  status: string;
}

export interface ActionRow {
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

export interface SessionWithMeta extends SessionRow {
  action_count: number;
  last_screenshot: string | null;
}

export function createSession(name: string, source: string = "viewer"): SessionRow {
  const db = getDb();
  const now = Date.now();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO sessions (id, name, source, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, 'active')"
  ).run(id, name, source, now, now);
  return { id, name, source, created_at: now, updated_at: now, status: "active" };
}

export function getSession(id: string): SessionRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
}

export function listSessions(): SessionWithMeta[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM actions a WHERE a.session_id = s.id) as action_count,
        (SELECT a.screenshot_path FROM actions a WHERE a.session_id = s.id AND a.screenshot_path IS NOT NULL ORDER BY a.timestamp DESC LIMIT 1) as last_screenshot
      FROM sessions s
      ORDER BY s.updated_at DESC`
    )
    .all() as SessionWithMeta[];
  return rows;
}

export function updateSession(id: string, updates: { name?: string; status?: string }): boolean {
  const db = getDb();
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [Date.now()];

  if (updates.name !== undefined) {
    sets.push("name = ?");
    params.push(updates.name);
  }
  if (updates.status !== undefined) {
    sets.push("status = ?");
    params.push(updates.status);
  }

  params.push(id);
  const result = db.prepare(`UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return result.changes > 0;
}

export function deleteSession(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getActiveSessionByName(name: string): SessionRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sessions WHERE name = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1")
    .get(name) as SessionRow | undefined;
}

// ── Action operations ──

export function insertAction(action: {
  session_id: string;
  command: string;
  result?: string | null;
  error?: string | null;
  screenshot_path?: string | null;
  url?: string | null;
  page_title?: string | null;
}): ActionRow {
  const db = getDb();
  const id = randomUUID();
  const timestamp = Date.now();

  db.prepare(
    `INSERT INTO actions (id, session_id, command, result, error, screenshot_path, url, page_title, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    action.session_id,
    action.command,
    action.result ?? null,
    action.error ?? null,
    action.screenshot_path ?? null,
    action.url ?? null,
    action.page_title ?? null,
    timestamp
  );

  // Update session's updated_at
  db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(timestamp, action.session_id);

  return {
    id,
    session_id: action.session_id,
    command: action.command,
    result: action.result ?? null,
    error: action.error ?? null,
    screenshot_path: action.screenshot_path ?? null,
    url: action.url ?? null,
    page_title: action.page_title ?? null,
    timestamp,
  };
}

export function updateAction(id: string, updates: {
  result?: string | null;
  error?: string | null;
  screenshot_path?: string | null;
  url?: string | null;
  page_title?: string | null;
}): boolean {
  const db = getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.result !== undefined) {
    sets.push("result = ?");
    params.push(updates.result);
  }
  if (updates.error !== undefined) {
    sets.push("error = ?");
    params.push(updates.error);
  }
  if (updates.screenshot_path !== undefined) {
    sets.push("screenshot_path = ?");
    params.push(updates.screenshot_path);
  }
  if (updates.url !== undefined) {
    sets.push("url = ?");
    params.push(updates.url);
  }
  if (updates.page_title !== undefined) {
    sets.push("page_title = ?");
    params.push(updates.page_title);
  }

  if (sets.length === 0) return false;
  params.push(id);
  const result = db.prepare(`UPDATE actions SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return result.changes > 0;
}

export function getSessionActions(sessionId: string): ActionRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM actions WHERE session_id = ? ORDER BY timestamp ASC")
    .all(sessionId) as ActionRow[];
}

export function searchSessions(query: string): SessionWithMeta[] {
  const db = getDb();
  const q = `%${query}%`;
  return db
    .prepare(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM actions a WHERE a.session_id = s.id) as action_count,
        (SELECT a.screenshot_path FROM actions a WHERE a.session_id = s.id AND a.screenshot_path IS NOT NULL ORDER BY a.timestamp DESC LIMIT 1) as last_screenshot
      FROM sessions s
      WHERE s.name LIKE ? OR date(s.created_at / 1000, 'unixepoch') LIKE ?
      ORDER BY s.updated_at DESC`
    )
    .all(q, q) as SessionWithMeta[];
}
