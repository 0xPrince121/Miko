import { getDb } from "./db";
import type { TicketType } from "./types";

function asRow<T>(value: unknown): T {
  return value as T;
}

export function listTicketTypes(guildId: string): TicketType[] {
  const db = getDb();
  return asRow<TicketType[]>(
    db.prepare(
      "SELECT * FROM ticket_types WHERE guild_id = ? ORDER BY sort ASC, id ASC",
    ).all(guildId),
  );
}

export function addTicketType(
  guildId: string,
  data: Pick<TicketType, "name" | "emoji" | "description" | "category_id" | "support_role">,
): TicketType {
  const db = getDb();
  const { max } = asRow<{ max: number }>(
    db.prepare("SELECT COALESCE(MAX(sort), 0) AS max FROM ticket_types WHERE guild_id = ?").get(guildId),
  );

  const result = db
    .prepare(
      `INSERT INTO ticket_types (guild_id, name, emoji, description, category_id, support_role, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(guildId, data.name, data.emoji, data.description, data.category_id, data.support_role, max + 1);

  return asRow<TicketType>(
    db.prepare("SELECT * FROM ticket_types WHERE id = ?").get(Number(result.lastInsertRowid)),
  );
}

export function updateTicketType(id: number, data: Partial<TicketType>): void {
  const db = getDb();
  db.prepare(
    `UPDATE ticket_types
     SET name = COALESCE(?, name),
         emoji = COALESCE(?, emoji),
         description = COALESCE(?, description),
         category_id = COALESCE(?, category_id),
         support_role = COALESCE(?, support_role),
         sort = COALESCE(?, sort)
     WHERE id = ?`,
  ).run(
    data.name ?? null,
    data.emoji ?? null,
    data.description ?? null,
    data.category_id ?? null,
    data.support_role ?? null,
    data.sort ?? null,
    id,
  );
}

export function deleteTicketType(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM ticket_types WHERE id = ?").run(id);
}

export function getTicketType(id: number): TicketType | null {
  const db = getDb();
  return asRow<TicketType | undefined>(db.prepare("SELECT * FROM ticket_types WHERE id = ?").get(id)) ?? null;
}

export function ensureDefaultType(guildId: string): TicketType[] {
  const types = listTicketTypes(guildId);
  if (types.length === 0) {
    addTicketType(guildId, {
      name: "General Support",
      emoji: "\u{1F3AB}",
      description: "General questions and support requests.",
      category_id: "",
      support_role: "",
    });
    return listTicketTypes(guildId);
  }
  return types;
}