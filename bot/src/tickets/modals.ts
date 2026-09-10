import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type GuildMember,
  type ModalSubmitInteraction,
} from "discord.js";
import { getGuildConfig, type Ticket } from "@miko/db";
import { isStaff, userIsCreatorOrMember } from "../permissions";
import { sendLog } from "../logs";
import { client } from "../client";
import { fetchTicketChannel } from "./helpers";

function userInput(customId: string, label: string, placeholder: string, required = true): TextInputBuilder {
  return new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(TextInputStyle.Short)
    .setRequired(required)
    .setMaxLength(100)
    .setPlaceholder(placeholder);
}

export async function openAddUserModal(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId(`modal:add:${ticket.id}`)
    .setTitle(`Add user to #${ticket.number}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        userInput("user", "User ID or mention", "@username or user ID"),
      ),
    );
  await interaction.showModal(modal);
}

export async function openRemoveUserModal(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId(`modal:remove:${ticket.id}`)
    .setTitle(`Remove user from #${ticket.number}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        userInput("user", "User ID or mention", "@username or user ID"),
      ),
    );
  await interaction.showModal(modal);
}

export async function openRenameModal(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId(`modal:rename:${ticket.id}`)
    .setTitle(`Rename #${ticket.number}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        userInput("name", "New channel name", "e.g. billing-issue-102", true),
      ),
    );
  await interaction.showModal(modal);
}

export async function submitRename(interaction: ModalSubmitInteraction, ticket: Ticket): Promise<void> {
  if (!interaction.guild) return;
  const member = interaction.member as GuildMember;
  const config = getGuildConfig(interaction.guild.id);
  if (!isStaff(member, config)) {
    await interaction.reply({ content: "Only staff can rename tickets.", ephemeral: true });
    return;
  }

  const name = interaction.fields.getTextInputValue("name").trim().toLowerCase();
  if (name.length < 1 || name.length > 100) {
    await interaction.reply({ content: "Channel name must be between 1 and 100 characters.", ephemeral: true });
    return;
  }
  const safe = name.replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "").slice(0, 100);
  if (!safe) {
    await interaction.reply({ content: "That name isn't valid.", ephemeral: true });
    return;
  }

  const channel = await fetchTicketChannel(client, ticket.channel_id);
  if (channel) {
    await channel.setName(safe);
  }

  await sendLog({
    guildId: interaction.guild.id,
    config,
    ticket,
    kind: "rename",
    fields: [
      { name: "New name", value: safe, inline: true },
      { name: "Renamed by", value: `<@${interaction.user.id}>`, inline: true },
    ],
  });

  await interaction.reply({ content: `Ticket renamed to **${safe}**.`, ephemeral: true });
}

export async function exportTranscript(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  if (!interaction.guild) return;
  const member = interaction.member as GuildMember;
  const config = getGuildConfig(interaction.guild.id);
  const authorized = isStaff(member, config) || userIsCreatorOrMember(ticket, interaction.user.id);
  if (!authorized) {
    await interaction.reply({ content: "You don't have access to that transcript.", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const { collectMessages, generateTranscriptHtml } = await import("../transcript");
  const channel = await fetchTicketChannel(client, ticket.channel_id);
  const messages = channel ? await collectMessages(channel) : [];

  const html = generateTranscriptHtml({
    guildName: interaction.guild.name,
    ticket,
    messages: messages.map((m) => ({
      author: { id: m.author.id, tag: m.author.tag, avatarUrl: m.author.displayAvatarURL() },
      content: m.content,
      timestamp: m.createdTimestamp,
      attachments: m.attachments.map((a) => ({ name: a.name, url: a.url })),
      embeds: m.embeds.map((e) => ({ title: e.title ?? "", description: e.description ?? "" })),
    })),
    closedAt: ticket.closed_at ?? Date.now(),
    closedByTag: "Miko",
    closeReason: ticket.close_reason ?? "",
  });

  await interaction.followUp({
    content: `Transcript for **#${ticket.number}** (${messages.length} messages)`,
    files: [
      {
        attachment: Buffer.from(html, "utf-8"),
        name: `ticket-${ticket.number}-transcript.html`,
      },
    ],
    ephemeral: true,
  });
}