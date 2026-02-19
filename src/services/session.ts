import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export interface UserSession {
  id: number;
  sessionId: string;
  userId: string;
  workingDir: string;
  name: string | null;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

interface SessionRow {
  id: number;
  session_id: string;
  user_id: string;
  working_dir: string;
  name: string | null;
  created_at: string;
  last_used_at: string;
}

function rowToSession(row: SessionRow, isActive: boolean): UserSession {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    workingDir: row.working_dir,
    name: row.name,
    isActive,
    createdAt: new Date(row.created_at + "Z"),
    lastUsedAt: new Date(row.last_used_at + "Z"),
  };
}

export class SessionService {
  private db: Database.Database;
  // In-memory active session tracking (userId -> sessionId)
  private activeSessions = new Map<string, string>();

  constructor(dbPath: string) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        working_dir TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);

    // Add name column if it doesn't exist (for migration)
    try {
      this.db.exec(`ALTER TABLE sessions ADD COLUMN name TEXT`);
    } catch {
      // Column already exists
    }
  }

  createSession(userId: string, workingDir: string): UserSession {
    const sessionId = randomUUID();

    const result = this.db
      .prepare(
        `INSERT INTO sessions (session_id, user_id, working_dir)
         VALUES (?, ?, ?)`
      )
      .run(sessionId, userId, workingDir);

    // Set as active session in memory
    this.activeSessions.set(userId, sessionId);

    return {
      id: result.lastInsertRowid as number,
      sessionId,
      userId,
      workingDir,
      name: null,
      isActive: true,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };
  }

  getUserSessions(userId: string): UserSession[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM sessions WHERE user_id = ? ORDER BY last_used_at DESC`
      )
      .all(userId) as SessionRow[];

    const activeSessionId = this.activeSessions.get(userId);

    return rows.map(row =>
      rowToSession(row, row.session_id === activeSessionId)
    );
  }

  getActiveSession(userId: string): UserSession | null {
    const activeSessionId = this.activeSessions.get(userId);
    if (!activeSessionId) {
      return null;
    }

    const row = this.db
      .prepare(`SELECT * FROM sessions WHERE session_id = ?`)
      .get(activeSessionId) as SessionRow | undefined;

    return row ? rowToSession(row, true) : null;
  }

  activateSession(userId: string, sessionId: string): void {
    // Verify session exists
    const row = this.db
      .prepare(`SELECT * FROM sessions WHERE session_id = ? AND user_id = ?`)
      .get(sessionId, userId) as SessionRow | undefined;

    if (row) {
      // Set as active session in memory
      this.activeSessions.set(userId, sessionId);

      // Update last_used_at
      this.db
        .prepare("UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE session_id = ?")
        .run(sessionId);
    }
  }

  updateSessionName(sessionId: string, name: string): void {
    // Extract first line only, limit to 50 characters
    const firstLine = name.split("\n")[0]?.trim().slice(0, 50) ?? "";
    if (firstLine) {
      this.db
        .prepare("UPDATE sessions SET name = ? WHERE session_id = ?")
        .run(firstLine, sessionId);
    }
  }

  updateLastUsed(sessionId: string): void {
    this.db
      .prepare("UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE session_id = ?")
      .run(sessionId);
  }

  deactivateSession(userId: string): void {
    this.activeSessions.delete(userId);
  }

  deleteSession(sessionId: string): void {
    // Deactivate if this is the active session
    for (const [userId, activeId] of this.activeSessions) {
      if (activeId === sessionId) {
        this.activeSessions.delete(userId);
        break;
      }
    }

    this.db.prepare("DELETE FROM sessions WHERE session_id = ?").run(sessionId);
  }
}
