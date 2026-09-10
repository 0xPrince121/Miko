import type { ButtonInteraction, GuildMember } from "discord.js";
import { getGuildConfig, updateTicket, type Ticket } from "@miko/db";
import { isStaff } from "../permissions";
import { refreshControlBar, ticketByChannel, fetchTicketChannel } from "./helpers";
import { sendLog } from "../logs";
import { embed, PRIMARY_COLOR } from "../constants";
import { client } from "../client";

export function assertTicketChannel(interaction: ButtonInteraction, ticket: Ticket): {
  ok: true;
} | { ok: false; error: string } {
  const channelTicket = ticketByChannel(interaction.channelId);
  if (!channelTicket || channelTicket.id !== ticket.id) {
    return { ok: false, error: "This ticket no longer exists." };
  }
  return { ok: true };
}

export async function claimTicket(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  if (!interaction.guild) return;
  const member = interaction.member as GuildMember;
  const config = getGuildConfig(interaction.guild.id);
  if (!isStaff(member, config)) {
    await interaction.reply({ content: "Only staff can claim tickets.", ephemeral: true });
    return;
  }
  if (ticket.status !== "open") {
    await interaction.reply({ content: "Only open tickets can be claimed.", ephemeral: true });
    return;
  }
  if (ticket.claimed_by) {
    await interaction.reply({
      content: ticket.claimed_by === interaction.user.id ? "You already claimed this ticket." : "This ticket is already claimed.",
      ephemeral: true,
    });
    return;
  }

  const updated = updateTicket(ticket.id, { claimed_by: interaction.user.id });
  if (updated) {
    const channel = await fetchTicketChannel(client, ticket.channel_id);
    if (channel) {
      await channel.send({
        embeds: [embed("Ticket Claimed", `This ticket has been claimed by <@${interaction.user.id}>. 🎫`, PRIMARY_COLOR)],
      });
      await refreshControlBar(channel, updated, config);
    }
    await sendLog({
      guildId: interaction.guild.id,
      config,
      ticket,
      kind: "claimed",
      fields: [{ name: "Claimed by", value: `<@${interaction.user.id}>`, inline: true }],
    });
    await interaction.reply({ content: `Ticket claimed by <@${interaction.user.id}>.`, ephemeral: true });
  }
}

export async function unclaimTicket(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  if (!interaction.guild) return;
  const member = interaction.member as GuildMember;
  const config = getGuildConfig(interaction.guild.id);
  if (!isStaff(member, config)) {
    await interaction.reply({ content: "Only staff can unclaim tickets.", ephemeral: true });
    return;
  }
  if (!ticket.claimed_by) {
    await interaction.reply({ content: "This ticket isn't claimed.", ephemeral: true });
    return;
  }

  const updated = updateTicket(ticket.id, { claimed_by: null });
  if (updated) {
    const channel = await fetchTicketChannel(client, ticket.channel_id);
    if (channel) {
      await channel.send({
        embeds: [embed("Ticket Unclaimed", `This ticket was unclaimed by <@${interaction.user.id}>.`, PRIMARY_COLOR)],
      });
      await refreshControlBar(channel, updated, config);
    }
    await sendLog({
      guildId: interaction.guild.id,
      config,
      ticket,
      kind: "unclaimed",
      fields: [{ name: "Unclaimed by", value: `<@${interaction.user.id}>`, inline: true }],
    });
    await interaction.reply({ content: "Ticket unclaimed.", ephemeral: true });
  }
}