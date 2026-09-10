import type { ButtonInteraction, GuildMember, ModalSubmitInteraction } from "discord.js";
import { getGuildConfig, addTicketUser, removeTicketUser, type Ticket } from "@miko/db";
import { isStaff, parseUserId } from "../permissions";
import { sendLog } from "../logs";
import { client } from "../client";
import { fetchTicketChannel } from "./helpers";

export async function assertStaff(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  ticket: Ticket,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!interaction.guild) return { ok: false, error: "Guild not found." };
  const member = interaction.member as GuildMember;
  const config = getGuildConfig(interaction.guild.id);
  if (!isStaff(member, config)) {
    return { ok: false, error: "Only staff can manage ticket members." };
  }
  if (ticket.status !== "open") {
    return { ok: false, error: "This ticket is not open." };
  }
  return { ok: true };
}

export async function addUser(interaction: ModalSubmitInteraction, ticket: Ticket, input: string): Promise<void> {
  const ok = await assertStaff(interaction, ticket);
  if (!ok.ok) {
    await interaction.reply({ content: ok.error, ephemeral: true });
    return;
  }
  const userId = parseUserId(input);
  if (!userId) {
    await interaction.reply({ content: "That doesn't look like a user ID or mention.", ephemeral: true });
    return;
  }
  const guild = interaction.guild;
  if (!guild) return;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "I couldn't find that user in this server.", ephemeral: true });
    return;
  }

  const channel = await fetchTicketChannel(client, ticket.channel_id);
  if (channel) {
    await channel
      .permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
        AddReactions: true,
      })
      .catch(() => {});
  }
  addTicketUser(ticket.id, userId);
  const config = getGuildConfig(ticket.guild_id);
  await sendLog({
    guildId: ticket.guild_id,
    config,
    ticket,
    kind: "user",
    fields: [
      { name: "User", value: `<@${userId}>`, inline: true },
      { name: "Action", value: "Added to ticket", inline: true },
      { name: "Added by", value: `<@${interaction.user.id}>`, inline: true },
    ],
  });

  if (channel) {
    await channel
      .send({ content: `<@${userId}> was added to this ticket by <@${interaction.user.id}>.` })
      .catch(() => {});
  }

  await interaction.reply({ content: `<@${userId}> was added to this ticket.`, ephemeral: true });
}

export async function removeUser(interaction: ModalSubmitInteraction, ticket: Ticket, input: string): Promise<void> {
  const ok = await assertStaff(interaction, ticket);
  if (!ok.ok) {
    await interaction.reply({ content: ok.error, ephemeral: true });
    return;
  }
  const userId = parseUserId(input);
  if (!userId) {
    await interaction.reply({ content: "That doesn't look like a user ID or mention.", ephemeral: true });
    return;
  }
  if (userId === ticket.creator_id) {
    await interaction.reply({ content: "You can't remove the ticket creator.", ephemeral: true });
    return;
  }

  const channel = await fetchTicketChannel(client, ticket.channel_id);
  if (channel) {
    await channel.permissionOverwrites.delete(userId).catch(() => {});
  }

  removeTicketUser(ticket.id, userId);
  const config = getGuildConfig(ticket.guild_id);
  await sendLog({
    guildId: ticket.guild_id,
    config,
    ticket,
    kind: "user",
    fields: [
      { name: "User", value: `<@${userId}>`, inline: true },
      { name: "Action", value: "Removed from ticket", inline: true },
      { name: "Removed by", value: `<@${interaction.user.id}>`, inline: true },
    ],
  });

  await interaction.reply({ content: `<@${userId}> was removed from this ticket.`, ephemeral: true });
}