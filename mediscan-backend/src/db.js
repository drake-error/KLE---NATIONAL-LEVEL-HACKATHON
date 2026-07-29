import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "traffic.sqlite"));

// WAL mode lets the event-log writer (engine "log" events, persisted as
// they happen) and readers (GET /api/history) proceed concurrently instead
// of blocking each other on every write.
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    meta TEXT
  )
`);

const insertStmt = db.prepare(
  "INSERT OR REPLACE INTO events (id, ts, type, severity, message, meta) VALUES (?, ?, ?, ?, ?, ?)",
);
const recentStmt = db.prepare("SELECT * FROM events ORDER BY ts DESC LIMIT ?");
const dispatchCountStmt = db.prepare("SELECT COUNT(*) as count FROM events WHERE type = 'dispatch' AND ts >= ?");

export function persistEvent(entry) {
  insertStmt.run(entry.id, entry.ts, entry.type, entry.severity, entry.message, JSON.stringify(entry.meta ?? {}));
}

export function loadRecentEvents(limit = 100) {
  return recentStmt.all(limit).map((row) => ({ ...row, meta: JSON.parse(row.meta || "{}") }));
}

export function countDispatchesSince(sinceMs) {
  return dispatchCountStmt.get(sinceMs).count;
}
