import { getDb } from "./db";
import type { GuildConfig } from "./types";

export function defaultConfig(guildId: string): GuildConfig {
  return {
    guild_id: guildId,
    ticket_category: "",
    closed_category: "",
    support_role: "",
    log_channel: "",
    transcript_channel: "",
    panel_channel: "",
    require_staff_role: 1,
    panel_title: "Need Help? \u{1F499}",
    panel_description:
      "Create a ticket and our support team will help you as soon as possible. Choose the appropriate option below to get started.",
    panel_emoji: "\u{1F3AB}",
    button_name: "Create Ticket",
    button_emoji: "\u{1F3AB}",
    ticket_limit: 0,
    auto_close_days: 0,
    transcript_dm: 1,
    close_action: "move",
    panel_message_id: "",
    updated_at: 0,
  };
}

export function getGuildConfig(guildId: string): GuildConfig {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM guild_config WHERE guild_id = ?")
    .get(guildId) as GuildConfig | undefined;
  if (!row) return defaultConfig(guildId);
  return { ...defaultConfig(guildId), ...row };
}

export function saveGuildConfig(
  guildId: string,
  patch: Partial<GuildConfig>,
): GuildConfig {
  const db = getDb();
  const current = { ...getGuildConfig(guildId), ...patch, guild_id: guildId };
  current.close_action = current.close_action === "delete" ? "delete" : "move";
  current.require_staff_role = current.require_staff_role ? 1 : 0;
  current.transcript_dm = current.transcript_dm ? 1 : 0;
  current.ticket_limit = Math.max(0, Number(current.ticket_limit) || 0);
  current.auto_close_days = Math.max(0, Number(current.auto_close_days) || 0);
  current.updated_at = Date.now();

  db.prepare(
    `INSERT INTO guild_config (
       guild_id, ticket_category, closed_category, support_role, log_channel,
       transcript_channel, panel_channel, require_staff_role, panel_title,
       panel_description, panel_emoji, button_name, button_emoji, ticket_limit,
       auto_close_days, transcript_dm, close_action, panel_message_id, updated_at
     ) VALUES (
       @guild_id, @ticket_category, @closed_category, @support_role, @log_channel,
       @transcript_channel, @panel_channel, @require_staff_role, @panel_title,
       @panel_description, @panel_emoji, @button_name, @button_emoji, @ticket_limit,
       @auto_close_days, @transcript_dm, @close_action, @panel_message_id, @updated_at
     )
     ON CONFLICT (guild_id) DO UPDATE SET
       ticket_category = excluded.ticket_category,
       closed_category = excluded.closed_category,
       support_role = excluded.support_role,
       log_channel = excluded.log_channel,
       transcript_channel = excluded.transcript_channel,
       panel_channel = excluded.panel_channel,
       require_staff_role = excluded.require_staff_role,
       panel_title = excluded.panel_title,
       panel_description = excluded.panel_description,
       panel_emoji = excluded.panel_emoji,
       button_name = excluded.button_name,
       button_emoji = excluded.button_emoji,
       ticket_limit = excluded.ticket_limit,
       auto_close_days = excluded.auto_close_days,
       transcript_dm = excluded.transcript_dm,
       close_action = excluded.close_action,
       panel_message_id = excluded.panel_message_id,
       updated_at = excluded.updated_at`,
  ).run(current as Record<string, string | number>);

  return getGuildConfig(guildId);
}