import { EmbedBuilder } from "discord.js";

/** Miko primary blue (#0057E7). */
export const PRIMARY_COLOR = 0x0057e7;
export const SUCCESS_COLOR = 0x22c55e;
export const DANGER_COLOR = 0xef4444;
export const WARNING_COLOR = 0xf59e0b;
export const NEUTRAL_COLOR = 0x64748b;

/** Ticket panel accent — soft warm rose-pink (#F0667A). */
export const PANEL_COLOR = 0xf0667a;

export const FOOTER = { text: "Miko", iconURL: undefined } as const;

export function embed(
  title?: string,
  description?: string,
  color: number = PRIMARY_COLOR,
): EmbedBuilder {
  const e = new EmbedBuilder().setColor(color).setFooter(FOOTER);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

/** Prefix the ticket number in channel names. */
export function ticketChannelName(number: number, username: string): string {
  const slug = username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 28)
    .replace(/^-|-$/g, "");
  return `ticket-${number}-${slug || "user"}`;
}

export function parseMentionOrId(input: string): string | null {
  const match = /<@!?(\d+)>/.exec(input.trim());
  if (match) return match[1];
  if (/^\d{17,20}$/.test(input.trim())) return input.trim();
  return null;
}