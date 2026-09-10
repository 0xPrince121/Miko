import {
  type ButtonInteraction,
  type GuildMember,
} from "discord.js";
import {
  countOpenTicketsByUser,
  getGuildConfig,
  getTicketType,
  updateTicket,
} from "@miko/db";
import { createTicketChannel, makeTicketEmbed, makeControlBar } from "./tickets/helpers";
import { sendLog } from "./logs";

export async function createTicket(opts: {
  interaction: ButtonInteraction;
  typeId: number;
}): Promise<void> {
  const { interaction, typeId } = opts;
  if (!interaction.guild) {
    await interaction.reply({ content: "This can only be used inside a server.", ephemeral: true });
    return;
  }
  const config = getGuildConfig(interaction.guild.id);
  const member = interaction.member as GuildMember;

  if (config.ticket_limit > 0) {
    const open = countOpenTicketsByUser(interaction.guild.id, interaction.user.id);
    if (open >= config.ticket_limit) {
      await interaction.reply({
        content: `You already have **${open}** open ticket${open === 1 ? "" : "s"}. Please close one before opening another (limit: ${config.ticket_limit}).`,
        ephemeral: true,
      });
      return;
    }
  }

  try {
    const type = getTicketType(typeId);
    const typeName = type?.name ?? "General Support";
    const { ticket, channel } = await createTicketChannel({
      guild: interaction.guild,
      creatorId: interaction.user.id,
      username: interaction.user.username,
      ticketTypeId: String(typeId),
      config,
    });

    await channel.send({ embeds: [makeTicketEmbed(ticket, member, typeName)] });
    const bar = makeControlBar(ticket, config);
    const control = await channel.send({ embeds: bar.embeds, components: bar.rows });
    updateTicket(ticket.id, { control_message_id: control.id });

    await sendLog({ guildId: interaction.guild.id, config, ticket, kind: "created" });

    await interaction.reply({ content: `Your ticket is ready → <#${channel.id}>`, ephemeral: true });
  } catch (err) {
    console.error("[miko] failed to create ticket:", err);
    await interaction
      .reply({ content: "Failed to create the ticket. Please try again.", ephemeral: true })
      .catch(() => {});
  }
}