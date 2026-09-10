import { client } from "./client";
import {
  embed,
  PRIMARY_COLOR,
  DANGER_COLOR,
  NEUTRAL_COLOR,
  SUCCESS_COLOR,
  WARNING_COLOR,
} from "./constants";
import type { GuildConfig, Ticket } from "@miko/db";
import type { TextChannel } from "discord.js";

interface LogInput {
  guildId: string;
  config: GuildConfig;
  ticket?: Ticket | null;
  fields?: { name: string; value: string; inline?: boolean }[];
  description?: string;
  kind: "created" | "claimed" | "unclaimed" | "closed" | "reopened" | "deleted" | "user" | "rename" | "info";
}

const KIND_COLORS: Record<LogInput["kind"], number> = {
  created: PRIMARY_COLOR,
  claimed: PRIMARY_COLOR,
  unclaimed: NEUTRAL_COLOR,
  closed: WARNING_COLOR,
  reopened: SUCCESS_COLOR,
  deleted: DANGER_COLOR,
  user: PRIMARY_COLOR,
  rename: PRIMARY_COLOR,
  info: NEUTRAL_COLOR,
};

const KIND_TITLES: Record<LogInput["kind"], string> = {
  created: "Ticket Created",
  claimed: "Ticket Claimed",
  unclaimed: "Ticket Unclaimed",
  closed: "Ticket Closed",
  reopened: "Ticket Reopened",
  deleted: "Ticket Deleted",
  user: "Ticket Updated",
  rename: "Ticket Renamed",
  info: "Ticket Info",
};

export async function sendLog(input: LogInput): Promise<void> {
  const guild = client.guilds.cache.get(input.guildId);
  if (!guild) return;
  const logChannel = resolveChannel(guild.id, input.config.log_channel);
  if (!logChannel) return;

  try {
    const e = embed(KIND_TITLES[input.kind], input.description, KIND_COLORS[input.kind]);
    if (input.ticket) {
      e.addFields(
        { name: "Ticket", value: `#${input.ticket.number}`, inline: true },
        { name: "User", value: `<@${input.ticket.creator_id}>`, inline: true },
      );
      if (input.ticket.claimed_by) {
        e.addFields({ name: "Claimed by", value: `<@${input.ticket.claimed_by}>`, inline: true });
      }
      e.addFields({ name: "Type", value: input.ticket.type_name || "General Support", inline: true });
    }
    for (const f of input.fields ?? []) {
      e.addFields(f);
    }
    e.setTimestamp(new Date());
    await logChannel.send({ embeds: [e] });
  } catch (err) {
    console.error(`[miko] failed to send log for ${input.guildId}:`, err);
  }
}

export function resolveChannel(guildId: string, channelId: string): TextChannel | null {
  if (!channelId) return null;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;
  const channel = guild.channels.cache.get(channelId) ?? null;
  if (channel && channel.isTextBased() && "send" in channel) {
    return channel as TextChannel;
  }
  return null;
}