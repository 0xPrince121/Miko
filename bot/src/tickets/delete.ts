import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type GuildMember,
} from "discord.js";
import { getGuildConfig, updateTicket, type Ticket } from "@miko/db";
import { isStaff } from "../permissions";
import { sendLog } from "../logs";
import { embed, DANGER_COLOR, PRIMARY_COLOR } from "../constants";
import { client } from "../client";
import { fetchTicketChannel } from "./helpers";

export async function requestDelete(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  if (!interaction.guild) return;
  const member = interaction.member as GuildMember;
  const config = getGuildConfig(interaction.guild.id);
  if (!isStaff(member, config)) {
    await interaction.reply({ content: "Only staff can delete tickets.", ephemeral: true });
    return;
  }

  const confirm = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setLabel("Yes, delete ticket")
      .setCustomId(`confirm:delete:${ticket.id}`),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Cancel")
      .setCustomId(`confirm:delete-cancel:${ticket.id}`),
  );

  await interaction.reply({
    embeds: [
      embed(
        "Delete this ticket?",
        `Deleting **#${ticket.number}** permanently removes the channel and its history. This cannot be undone.`,
        DANGER_COLOR,
      ),
    ],
    components: [confirm],
    ephemeral: true,
    files: [],
  });
}

export async function finalizeDelete(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  if (!interaction.guild) return;
  const config = getGuildConfig(interaction.guild.id);
  const channel = await fetchTicketChannel(client, ticket.channel_id);

  await sendLog({
    guildId: interaction.guild.id,
    config,
    ticket,
    kind: "deleted",
    fields: [{ name: "Deleted by", value: `<@${interaction.user.id}>`, inline: true }],
  });

  updateTicket(ticket.id, { status: "deleted" });

  if (channel) {
    try {
      await channel.send({
        embeds: [embed("Ticket Deleted", `This ticket was deleted by <@${interaction.user.id}>.`, DANGER_COLOR)],
      });
    } catch {
      /* ignore */
    }
    await channel.delete().catch(() => {});
  }

  await interaction
    .reply({ content: `Ticket **#${ticket.number}** deleted.`, ephemeral: true })
    .catch(() => {});
}