import { allOpenTickets, getGuildConfig } from "@miko/db";
import { client } from "./client";
import { finalizeClose } from "./tickets/close";

const INTERVAL_MS = 60 * 60 * 1000; // hourly

export function startAutoClose(): void {
  setInterval(runAutoClose, INTERVAL_MS);
  void runAutoClose();
}

async function runAutoClose(): Promise<void> {
  const tickets = allOpenTickets();
  for (const ticket of tickets) {
    try {
      const config = getGuildConfig(ticket.guild_id);
      if (config.auto_close_days <= 0) continue;
      const cutoff = Date.now() - config.auto_close_days * 24 * 60 * 60 * 1000;
      if (ticket.created_at > cutoff) continue;
      if (!client.guilds.cache.has(ticket.guild_id)) continue;

      console.log(`[miko] auto-closing ticket #${ticket.number} in ${ticket.guild_id}`);
      await finalizeClose(null, ticket, `Auto-closed after ${config.auto_close_days} day(s) with no reply.`);
    } catch (err) {
      console.error("[miko] auto-close error:", err);
    }
  }
}