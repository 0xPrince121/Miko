import { getDb } from "./db";
import type { Ticket, TicketStatus } from "./types";

type Row = Record<string, unknown>;

function asRow<T>(value: unknown): T {
  return value as T;
}

export function getNextTicketNumber(guildId: string): number {
  const db = getDb();
  const row = asRow<{ max: number }>(
    db.prepare("SELECT COALESCE(MAX(number), 0) AS max FROM tickets WHERE guild_id = ?").get(guildId),
  );
  return row.max + 1;
}

export function createTicket(data: {
  guildId: string;
  number: number;
  channelId: string;
  typeName: string;
  creatorId: string;
}): Ticket {
  const db = getDb();
  const now = Date.now();
  const result = db
    .prepare(
      `INSERT INTO tickets (number, guild_id, channel_id, type_name, creator_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    )
    .run(data.number, data.guildId, data.channelId, data.typeName, data.creatorId, now);

  const id = Number(result.lastInsertRowid);
  db.prepare("INSERT OR IGNORE INTO ticket_users (ticket_id, user_id, added_at) VALUES (?, ?, ?)").run(
    id,
    data.creatorId,
    now,
  );
  return getTicket(id)!;
}

export function getTicket(id: number): Ticket | null {
  const db = getDb();
  return asRow<Ticket | undefined>(db.prepare("SELECT * FROM tickets WHERE id = ?").get(id)) ?? null;
}

export function getTicketByChannel(channelId: string): Ticket | null {
  const db = getDb();
  return (
    asRow<Ticket | undefined>(db.prepare("SELECT * FROM tickets WHERE channel_id = ?").get(channelId)) ?? null
  );
}

export function listTickets(guildId: string, status?: TicketStatus): Ticket[] {
  const db = getDb();
  if (status) {
    return asRow<Ticket[]>(
      db
        .prepare("SELECT * FROM tickets WHERE guild_id = ? AND status = ? ORDER BY number DESC")
        .all(guildId, status),
    );
  }
  return asRow<Ticket[]>(
    db.prepare("SELECT * FROM tickets WHERE guild_id = ? ORDER BY number DESC").all(guildId),
  );
}

export function countOpenTicketsByUser(guildId: string, userId: string): number {
  const db = getDb();
  const row = asRow<{ c: number }>(
    db
      .prepare("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ? AND creator_id = ? AND status = 'open'")
      .get(guildId, userId),
  );
  return row.c;
}

export function updateTicket(id: number, patch: Partial<Ticket>): Ticket | null {
  const db = getDb();
  const allowed: (keyof Ticket)[] = [
    "channel_id",
    "claimed_by",
    "control_message_id",
    "status",
    "closed_at",
    "close_reason",
    "type_name",
  ];
  const keyNames: string[] = [];
  const values: (string | number | null)[] = [];
  for (const key of allowed) {
    const value = patch[key];
    if (value !== undefined) {
      keyNames.push(`${key as string} = ?`);
      values.push(value as string | number | null);
    }
  }
  if (keyNames.length === 0) return getTicket(id);
  values.push(id);
  db.prepare(`UPDATE tickets SET ${keyNames.join(", ")} WHERE id = ?`).run(...values);
  return getTicket(id);
}

export function getTicketStats(guildId: string) {
  const db = getDb();
  const row = asRow<{ open: number; closed: number; deleted: number; total: number }>(
    db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)   AS open,
           SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
           SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) AS deleted,
           COUNT(*)                                           AS total
         FROM tickets WHERE guild_id = ?`,
      )
      .get(guildId),
  );

  return {
    open: row.open ?? 0,
    closed: row.closed ?? 0,
    deleted: row.deleted ?? 0,
    total: row.total ?? 0,
    inProgress: (row.open ?? 0) + (row.closed ?? 0),
  };
}

export function recentTickets(guildId: string, limit = 5): Ticket[] {
  const db = getDb();
  return asRow<Ticket[]>(
    db.prepare("SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?").all(guildId, limit),
  );
}

export function openTicketsOlderThan(guildId: string, days: number): Ticket[] {
  const db = getDb();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return asRow<Ticket[]>(
    db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND status = 'open' AND created_at <= ?").all(guildId, cutoff),
  );
}

export function allOpenTickets(): Ticket[] {
  const db = getDb();
  return asRow<Ticket[]>(db.prepare("SELECT * FROM tickets WHERE status = 'open'").all());
}

// ---- ticket users ---------------------------------------------------------

export function addTicketUser(ticketId: number, userId: string): void {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO ticket_users (ticket_id, user_id, added_at) VALUES (?, ?, ?)").run(
    ticketId,
    userId,
    Date.now(),
  );
}

export function removeTicketUser(ticketId: number, userId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM ticket_users WHERE ticket_id = ? AND user_id = ?").run(ticketId, userId);
}

export function listTicketUsers(ticketId: number): string[] {
  const db = getDb();
  const rows = asRow<{ user_id: string }[]>(
    db.prepare("SELECT user_id FROM ticket_users WHERE ticket_id = ?").all(ticketId),
  );
  return rows.map((r) => r.user_id);
}

export function userHasTicketAccess(ticketId: number, userId: string): boolean {
  const db = getDb();
  const row = asRow<{ ok: number } | undefined>(
    db.prepare("SELECT 1 AS ok FROM ticket_users WHERE ticket_id = ? AND user_id = ?").get(ticketId, userId),
  );
  return Boolean(row);
}