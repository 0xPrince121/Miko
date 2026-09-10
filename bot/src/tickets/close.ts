import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type GuildMember,
  type ModalSubmitInteraction,
} from "discord.js";
import { getGuildConfig, updateTicket, type Ticket } from "@miko/db";
import { isStaff } from "../permissions";
import { refreshControlBar, ticketByChannel, fetchTicketChannel } from "./helpers";
import { sendLog, resolveChannel } from "../logs";
import { embed, PRIMARY_COLOR } from "../constants";
import { client } from "../client";

type TicketInteraction = ButtonInteraction | ModalSubmitInteraction;

export async function requestClose(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  const can = await canManage(interaction, ticket);
  if (!can.ok) {
    await interaction.reply({ content: can.error, ephemeral: true });
    return;
  }
  if (ticket.status !== "open") {
    await interaction.reply({ content: "Only open tickets can be closed.", ephemeral: true });
    return;
  }

  const confirm = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Success)
      .setLabel("Yes, close ticket")
      .setCustomId(`confirm:close:${ticket.id}`),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Cancel")
      .setCustomId(`confirm:close-cancel:${ticket.id}`),
  );

  await interaction.reply({
    embeds: [
      embed(
        "Close this ticket?",
        `Closing **#${ticket.number}** will lock the channel and generate a transcript.\nYou'll be able to add an optional close reason in the next step.`,
        PRIMARY_COLOR,
      ),
    ],
    components: [confirm],
    ephemeral: true,
  });
}

export async function openCloseModal(interaction: ButtonInteraction, ticket: Ticket): Promise<void> {
  const input = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("close_reason")
      .setLabel("Close reason (optional)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(200)
      .setPlaceholder("e.g. Issue has been resolved"),
  );

  const modal = new ModalBuilder()
    .setCustomId(`modal:close:${ticket.id}`)
    .setTitle(`Close ticket #${ticket.number}`)
    .addComponents(input);

  await interaction.showModal(modal);
}

export async function submitCloseModal(
  interaction: ModalSubmitInteraction,
  ticket: Ticket,
): Promise<void> {
  const reason = interaction.fields.getTextInputValue("close_reason").trim();
  await finalizeClose(interaction, ticket, reason);
}

export async function finalizeClose(
  interaction: TicketInteraction | null,
  ticket: Ticket,
  reason: string,
): Promise<void> {
  const config = getGuildConfig(ticket.guild_id);
  const channel = await fetchTicketChannel(client, ticket.channel_id);

  const updated =
    updateTicket(ticket.id, {
      status: "closed",
      closed_at: Date.now(),
      close_reason: reason || null,
    }) ?? ticket;

  // 1) Confirm immediately — the user always sees feedback, even if a later step fails.
  const text = `Ticket **#${ticket.number}** closed.${reason ? `\nReason: ${reason}` : ""}`;
  try {
    if (interaction?.replied || interaction?.deferred) {
      await interaction.followUp({ content: text });
    } else if (interaction) {
      await interaction.reply({ content: text, ephemeral: true });
    }
  } catch {
    /* interaction already expired */
  }

  // 2) Lock the channel (best effort per overwrite).
  if (channel) {
    await channel.permissionOverwrites
      .edit(ticket.creator_id, { SendMessages: false })
      .catch(() => {});
    await channel.permissionOverwrites
      .edit(channel.guild.roles.everyone.id, { SendMessages: false })
      .catch(() => {});
    if (config.support_role) {
      await channel.permissionOverwrites
        .edit(config.support_role, { SendMessages: false })
        .catch(() => {});
    }
  }

  // 3) Transcript + notifications + cleanup — best effort, never blocks the close.
  try {
    const { collectMessages, generateTranscriptHtml } = await import("../transcript");
    const messages = channel ? await collectMessages(channel) : [];
    const transcriptHtml = generateTranscriptHtml({
      guildName: channel?.guild.name ?? "Unknown Server",
      ticket: updated,
      messages: messages.map((m) => ({
        author: { id: m.author.id, tag: m.author.tag, avatarUrl: m.author.displayAvatarURL() },
        content: m.content,
        timestamp: m.createdTimestamp,
        attachments: m.attachments.map((a) => ({ name: a.name, url: a.url })),
        embeds: m.embeds.map((e) => ({ title: e.title ?? "", description: e.description ?? "" })),
      })),
      closedAt: Date.now(),
      closedByTag: "Miko",
      closeReason: reason,
    });
    const file = {
      attachment: Buffer.from(transcriptHtml, "utf-8"),
      name: `ticket-${updated.number}-transcript.html`,
    };

    const transcriptChannel = resolveChannel(ticket.guild_id, config.transcript_channel);
    if (transcriptChannel) {
      await transcriptChannel
        .send({
          embeds: [
            embed("Transcript", `Transcript for **#${updated.number}**\nUser: <@${updated.creator_id}>`, PRIMARY_COLOR),
          ],
          files: [file],
        })
        .catch((e) => console.error("[miko] transcript send failed:", e));
    }

    if (config.transcript_dm) {
      const guild = client.guilds.cache.get(ticket.guild_id);
      const creator =
        guild?.members.cache.get(ticket.creator_id) ??
        (await guild?.members.fetch(ticket.creator_id).catch(() => null));
      try {
        await creator?.send({
          embeds: [
            embed(
              "Your ticket was closed",
              `Thank you for reaching out in **${guild?.name ?? "Miko"}**.\nTicket: **#${updated.number}**\n${
                reason ? `Reason: ${reason}` : ""
              }`,
              PRIMARY_COLOR,
            ),
          ],
          files: [file],
        });
      } catch {
        /* user closed their DMs — ignore */
      }
    }

    if (config.close_action === "delete") {
      await sendLog({
        guildId: ticket.guild_id,
        config,
        ticket: updated,
        kind: "closed",
        fields: [
          { name: "Closed by", value: "System", inline: true },
          { name: "Action", value: "Channel will be deleted", inline: true },
          ...(reason ? [{ name: "Reason", value: reason, inline: false }] : []),
        ],
      });
      if (channel) {
        await channel.delete().catch(() => {});
      }
      updateTicket(ticket.id, { status: "deleted" });
    } else {
      if (config.closed_category && channel) {
        await channel.setParent(config.closed_category).catch(() => {});
      }
      await sendLog({
        guildId: ticket.guild_id,
        config,
        ticket: updated,
        kind: "closed",
        fields: [
          { name: "Closed by", value: "System", inline: true },
          ...(reason ? [{ name: "Reason", value: reason, inline: false }] : []),
        ],
      });
      if (channel) {
        await refreshControlBar(channel, updated, config);
      }
    }
  } catch (err) {
    console.error("[miko] close side-effects failed:", err);
  }
}

async function canManage(
  interaction: ButtonInteraction,
  ticket: Ticket,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!interaction.guild) return { ok: false, error: "Guild not found." };
  const channelTicket = ticketByChannel(interaction.channelId);
  if (!channelTicket || channelTicket.id !== ticket.id) {
    return { ok: false, error: "This ticket no longer exists." };
  }
  const member = interaction.member as GuildMember;
  const config = getGuildConfig(interaction.guild.id);
  // The ticket creator can always close their own ticket.
  if (member.id === ticket.creator_id) return { ok: true };
  if (!isStaff(member, config)) {
    return { ok: false, error: "Only staff (or the ticket creator) can close tickets." };
  }
  return { ok: true };
}