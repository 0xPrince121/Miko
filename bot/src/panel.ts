import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Guild,
  type TextChannel,
} from "discord.js";
import {
  ensureDefaultType,
  getGuildConfig,
  saveGuildConfig,
} from "@miko/db";
import { PANEL_COLOR } from "./constants";

export async function removePanel(
  guild: Guild,
): Promise<{ ok: boolean; message: string }> {
  const config = getGuildConfig(guild.id);
  if (!config.panel_message_id) {
    return { ok: false, message: "No panel is deployed in this server." };
  }
  const channel = await guild.channels.fetch(config.panel_channel).catch(() => null);
  if (channel && channel.isTextBased()) {
    const msg = await channel.messages.fetch(config.panel_message_id).catch(() => null);
    if (msg) await msg.delete().catch(() => {});
  }
  saveGuildConfig(guild.id, { panel_message_id: "" });
  return { ok: true, message: "Panel removed." };
}

export async function deployPanel(
  guild: Guild,
  channelIdOverride?: string,
): Promise<{ ok: boolean; message: string; messageId?: string }> {
  const config = getGuildConfig(guild.id);
  const types = ensureDefaultType(guild.id);
  const panelChannelId = channelIdOverride || config.panel_channel;

  if (!panelChannelId) {
    return { ok: false, message: "No panel channel configured. Pick one from the dashboard." };
  }

  const channel = (await guild.channels.fetch(panelChannelId).catch(() => null)) as
    | TextChannel
    | null;
  if (!channel || channel.type !== ChannelType.GuildText) {
    return { ok: false, message: "The configured panel channel doesn't exist or isn't a text channel." };
  }

  const me = guild.members.me ?? (await guild.members.fetch(guild.client.user!.id).catch(() => null));
  if (!me) {
    return { ok: false, message: "I couldn't find my own membership in this server." };
  }
  const perms = channel.permissionsFor(me);
  const needed = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory,
  ];
  if (!perms?.has(needed as never)) {
    return {
      ok: false,
      message: `I'm missing permissions in ${channel}. I need: View Channel, Send Messages, Embed Links, Attach Files, Read Message History.`,
    };
  }

  const title = config.panel_emoji ? `${config.panel_emoji} ${config.panel_title}` : config.panel_title;
  const e = new EmbedBuilder()
    .setColor(PANEL_COLOR)
    .setTitle(title)
    .setDescription(config.panel_description)
    .setFooter({ text: "Miko" });

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < types.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const t of types.slice(i, i + 5)) {
      // Single type → use the configured button name/emoji; multiple → one button per type.
      const isSingle = types.length === 1;
      const emoji = isSingle ? config.button_emoji || t.emoji : t.emoji;
      const label = isSingle ? config.button_name : t.name;
      const btn = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`panel-create:${t.id}`);
      if (label) btn.setLabel(label);
      if (emoji) btn.setEmoji(emoji);
      row.addComponents(btn);
    }
    rows.push(row);
  }

  // Remove the previous panel message if it still exists.
  if (config.panel_message_id) {
    try {
      const old = await channel.messages.fetch(config.panel_message_id).catch(() => null);
      if (old) await old.delete();
    } catch {
      /* ignore */
    }
  }

  const sent = await channel.send({ embeds: [e], components: rows });
  saveGuildConfig(guild.id, { panel_message_id: sent.id });
  return { ok: true, message: "Panel deployed.", messageId: sent.id };
}