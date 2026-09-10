import type { ButtonInteraction, GuildMember } from "discord.js";
import { getGuildConfig, updateTicket, type Ticket } from "@miko/db";
import { isStaff } from "../permissions";
import { refreshControlBar, ticketByChannel, fetchTicketChannel } from "./helpers";
import { sendLog } from "../logs";
import { embed, PRIMARY_COLOR, SUCCESS_COLOR } from "../constants";
import { client } from "../client";

export async function reopenTicket(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  if (!interaction.guild) return;
  const member = interaction.member as GuildMember;
  const config = getGuildConfig(interaction.guild.id);
  const isCreator = ticket.creator_id === interaction.user.id;
  if (!isCreator && !isStaff(member, config)) {
    await interaction.reply({ content: "You don't have permission to reopen this ticket.", ephemeral: true });
    return;
  }
  if (ticket.status !== "closed") {
    await interaction.reply({ content: "Only closed tickets can be reopened.", ephemeral: true });
    return;
  }
  const channelTicket = ticketByChannel(interaction.channelId);
  if (!channelTicket || channelTicket.id !== ticket.id) {
    await interaction.reply({ content: "This ticket no longer exists.", ephemeral: true });
    return;
  }

  const updated = updateTicket(ticket.id, {
    status: "open",
    closed_at: null,
    close_reason: null,
  });
  if (!updated) return;

  const channel = await fetchTicketChannel(client, ticket.channel_id);
  if (channel) {
    await channel
      .permissionOverwrites.edit(ticket.creator_id, { SendMessages: true, ViewChannel: true })
      .catch(() => {});
    if (config.support_role) {
      await channel.permissionOverwrites.edit(config.support_role, { SendMessages: true }).catch(() => {});
    }
    if (config.ticket_category && "setParent" in channel) {
      await channel.setParent(config.ticket_category).catch(() => {});
    }
    await channel.send({
      embeds: [embed("Ticket Reopened", `This ticket was reopened by <@${interaction.user.id}>. 🔓`, SUCCESS_COLOR)],
    });
    await refreshControlBar(channel, updated, config);
  }

  await sendLog({
    guildId: interaction.guild.id,
    config,
    ticket: updated,
    kind: "reopened",
    fields: [{ name: "Reopened by", value: `<@${interaction.user.id}>`, inline: true }],
  });

  await interaction.reply({ content: `Ticket **#${ticket.number}** reopened.`, ephemeral: true });
}