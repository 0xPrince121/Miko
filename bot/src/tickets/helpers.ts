import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  type OverwriteResolvable,
  type TextChannel,
} from "discord.js";
import {
  getGuildConfig,
  getTicket,
  getTicketByChannel,
  getTicketType,
  getNextTicketNumber,
  createTicket,
  type GuildConfig,
  type Ticket,
} from "@miko/db";
import { embed, PRIMARY_COLOR, FOOTER } from "../constants";
import { resolveRole, isStaff } from "../permissions";

export function typeSupportRole(ticketTypeId: string | undefined): string {
  if (!ticketTypeId) return "";
  return getTicketType(Number(ticketTypeId))?.support_role ?? "";
}

// ---- permission overwrites -------------------------------------------------

const MEMBER_ALLOW: bigint[] = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AddReactions,
];

const STAFF_ALLOW: bigint[] = [...MEMBER_ALLOW, PermissionFlagsBits.ManageMessages];

export function ticketOverwrites(opts: {
  guild: Guild;
  creatorId: string;
  supportRoleId: string;
  clientUserId?: string;
}): OverwriteResolvable[] {
  const { guild, creatorId, supportRoleId, clientUserId } = opts;
  const overwrites: OverwriteResolvable[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    },
    { id: creatorId, allow: MEMBER_ALLOW },
  ];
  if (supportRoleId) overwrites.push({ id: supportRoleId, allow: STAFF_ALLOW });
  if (clientUserId) {
    overwrites.push({
      id: clientUserId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AddReactions,
      ],
    });
  }
  return overwrites;
}

export const MEMBER_OVERWRITE_ALLOW: bigint[] = MEMBER_ALLOW;

export async function resolveStaffRoleId(
  guild: Guild,
  config: GuildConfig,
  ticketTypeId?: string,
): Promise<string> {
  const override = typeSupportRole(ticketTypeId);
  const roleId = override || config.support_role;
  const role = await resolveRole(guild, roleId).catch(() => undefined);
  return role?.id ?? "";
}

export function findTicketById(id: string | number): Ticket | null {
  return getTicket(typeof id === "number" ? id : parseInt(id, 10)) ?? null;
}

export function ticketByChannel(channelId: string): Ticket | null {
  return getTicketByChannel(channelId);
}

// ---- embeds / controls -----------------------------------------------------

export function makeTicketEmbed(
  ticket: Ticket,
  creator: GuildMember | undefined,
  typeName: string,
): EmbedBuilder {
  const e = embed(
    `Ticket #${ticket.number}`,
    `Support ticket opened. A member of our team will be with you shortly.\n\n> **Type:** ${typeName}\n> **Status:** ${
      ticket.status === "open" ? "Open" : "Closed"
    }\n> **Created:** <t:${Math.floor(ticket.created_at / 1000)}:R>`,
    PRIMARY_COLOR,
  );
  e.setFooter(FOOTER);
  if (creator) {
    e.setAuthor({ name: creator.user.username, iconURL: creator.user.displayAvatarURL() });
  }
  return e;
}

export function makeControlBar(ticket: Ticket, config: GuildConfig): {
  embeds: EmbedBuilder[];
  rows: ActionRowBuilder<ButtonBuilder>[];
} {
  const status = ticket.status === "open" ? "Open" : "Closed";
  const claimText = ticket.claimed_by ? `<@${ticket.claimed_by}>` : "Not claimed";
  const e = embed(
    "Ticket Actions",
    `**Status:** ${status}\n**Claimed by:** ${claimText}\n\nUse the buttons below to manage this ticket.`,
    PRIMARY_COLOR,
  );

  const btn = (
    action: string,
    label: string,
    style: ButtonStyle,
    emoji?: string,
    disabled = false,
  ) => {
    const b = new ButtonBuilder()
      .setStyle(style)
      .setCustomId(`ticket:${action}:${ticket.id}`)
      .setLabel(label)
      .setDisabled(disabled);
    if (emoji) b.setEmoji(emoji);
    return b;
  };

  const open = ticket.status === "open";

  const row1 = new ActionRowBuilder<ButtonBuilder>();
  if (ticket.claimed_by) {
    row1.addComponents(btn("unclaim", "Unclaim", ButtonStyle.Secondary, "↩️"));
  } else {
    row1.addComponents(btn("claim", "Claim", ButtonStyle.Primary, "🎫", !open));
  }
  row1.addComponents(
    btn("close", "Close", ButtonStyle.Danger, "🔒", !open),
    btn("reopen", "Reopen", ButtonStyle.Secondary, "🔓", open),
    btn("transcript", "Transcript", ButtonStyle.Secondary, "📜"),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>();
  row2.addComponents(
    btn("add", "Add User", ButtonStyle.Secondary, "➕"),
    btn("remove", "Remove User", ButtonStyle.Secondary, "➖"),
    btn("rename", "Rename", ButtonStyle.Secondary, "✏️"),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>();
  row3.addComponents(btn("delete", "Delete", ButtonStyle.Danger, "🗑️"));

  return { embeds: [e], rows: [row1, row2, row3] };
}

export async function refreshControlBar(
  channel: GuildTextBasedChannel,
  ticket: Ticket,
  config: GuildConfig,
): Promise<void> {
  if (!ticket.control_message_id) return;
  try {
    const msg = await channel.messages.fetch(ticket.control_message_id).catch(() => null);
    if (!msg) return;
    const bar = makeControlBar(ticket, config);
    await msg.edit({ embeds: bar.embeds, components: bar.rows });
  } catch (err) {
    console.error("[miko] failed to refresh control bar:", err);
  }
}

export async function createTicketChannel(opts: {
  guild: Guild;
  creatorId: string;
  username: string;
  ticketTypeId?: string;
  config: GuildConfig;
}): Promise<{ ticket: Ticket; channel: GuildTextBasedChannel; typeName: string }> {
  const { guild, creatorId, username, ticketTypeId, config } = opts;
  const number = getNextTicketNumber(guild.id);
  const type = ticketTypeId ? getTicketType(Number(ticketTypeId)) : null;
  const typeName = type?.name ?? "General Support";
  const supportRoleId = await resolveStaffRoleId(guild, config, ticketTypeId);
  const parentId = (type?.category_id || config.ticket_category) || undefined;

  const channel = await guild.channels.create({
    name: `ticket-${number}-${username.toLowerCase().slice(0, 20).replace(/[^a-z0-9-]/g, "-")}`,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites: ticketOverwrites({
      guild,
      creatorId,
      supportRoleId,
      clientUserId: guild.client.user?.id,
    }),
  });

  const ticket = createTicket({
    guildId: guild.id,
    number,
    channelId: channel.id,
    typeName,
    creatorId,
  });

  return { ticket, channel: channel as TextChannel, typeName };
}

export function staffCanReopen(config: GuildConfig, member: GuildMember, canManage: boolean): boolean {
  return canManage || isStaff(member, config);
}

export async function fetchTicketChannel(
  client: { channels: { fetch: (id: string) => Promise<unknown> } },
  channelId: string,
): Promise<TextChannel | null> {
  const channel = (await client.channels.fetch(channelId).catch(() => null)) as unknown as TextChannel | null;
  if (!channel || !("guild" in channel)) return null;
  return channel;
}