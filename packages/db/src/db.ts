import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { repoRoot } from "./path";

let _db: DatabaseSync | null = null;

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL ?? "file:data/miko.db";
  let p = raw;
  if (/^file:/i.test(p)) p = p.replace(/^file:/i, "");
  if (p.startsWith("sqlite:")) p = p.replace(/^sqlite:/i, "");
  if (!path.isAbsolute(p)) p = path.join(repoRoot(), p);
  return p;
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id          TEXT PRIMARY KEY,
      ticket_category   TEXT NOT NULL DEFAULT '',
      closed_category   TEXT NOT NULL DEFAULT '',
      support_role      TEXT NOT NULL DEFAULT '',
      log_channel       TEXT NOT NULL DEFAULT '',
      transcript_channel TEXT NOT NULL DEFAULT '',
      panel_channel     TEXT NOT NULL DEFAULT '',
      require_staff_role INTEGER NOT NULL DEFAULT 1,
      panel_title       TEXT NOT NULL DEFAULT 'Need Help? \u{1F499}',
      panel_description TEXT NOT NULL DEFAULT 'Create a ticket and our support team will help you as soon as possible. Choose the appropriate option below to get started.',
      panel_emoji       TEXT NOT NULL DEFAULT '\u{1F3AB}',
      button_name       TEXT NOT NULL DEFAULT 'Create Ticket',
      button_emoji      TEXT NOT NULL DEFAULT '\u{1F3AB}',
      ticket_limit      INTEGER NOT NULL DEFAULT 0,
      auto_close_days   INTEGER NOT NULL DEFAULT 0,
      transcript_dm     INTEGER NOT NULL DEFAULT 1,
      close_action      TEXT NOT NULL DEFAULT 'move',
      panel_message_id  TEXT NOT NULL DEFAULT '',
      updated_at        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ticket_types (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id     TEXT NOT NULL,
      name         TEXT NOT NULL,
      emoji        TEXT NOT NULL DEFAULT '\u{1F3AB}',
      description  TEXT NOT NULL DEFAULT '',
      category_id  TEXT NOT NULL DEFAULT '',
      support_role TEXT NOT NULL DEFAULT '',
      sort         INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      number            INTEGER NOT NULL,
      guild_id          TEXT NOT NULL,
      channel_id        TEXT NOT NULL DEFAULT '',
      type_name         TEXT NOT NULL DEFAULT 'General Support',
      creator_id        TEXT NOT NULL,
      claimed_by        TEXT DEFAULT NULL,
      control_message_id TEXT NOT NULL DEFAULT '',
      status            TEXT NOT NULL DEFAULT 'open',
      created_at        INTEGER NOT NULL,
      closed_at         INTEGER DEFAULT NULL,
      close_reason      TEXT DEFAULT NULL,
      UNIQUE (guild_id, number)
    );

    CREATE TABLE IF NOT EXISTS ticket_users (
      ticket_id  INTEGER NOT NULL,
      user_id    TEXT NOT NULL,
      added_at   INTEGER NOT NULL,
      PRIMARY KEY (ticket_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_guild      ON tickets (guild_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status     ON tickets (status);
    CREATE INDEX IF NOT EXISTS idx_tickets_channel    ON tickets (channel_id);
    CREATE INDEX IF NOT EXISTS idx_types_guild        ON ticket_types (guild_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_users_user  ON ticket_users (user_id);
  `);
}

/** Lazily-initialised singleton database handle. */
export function getDb(): DatabaseSync {
  if (!_db) {
    const file = resolveDbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    _db = new DatabaseSync(file);
    migrate(_db);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}