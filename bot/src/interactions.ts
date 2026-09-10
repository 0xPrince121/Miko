import type { Interaction, ButtonInteraction, ModalSubmitInteraction, GuildMember } from "discord.js";
import { getTicket } from "@miko/db";
import { createTicket } from "./createTicket";
import { claimTicket, unclaimTicket } from "./tickets/claim";
import { requestClose, openCloseModal, submitCloseModal } from "./tickets/close";
import { requestDelete, finalizeDelete } from "./tickets/delete";
import { reopenTicket } from "./tickets/reopen";
import { addUser, removeUser } from "./tickets/members";
import { openAddUserModal, openRemoveUserModal, openRenameModal, submitRename, exportTranscript } from "./tickets/modals";
import { handleSlashCommand } from "./commands";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
    return;
  }
  if (interaction.isButton()) {
    await handleButton(interaction);
    return;
  }
  if (interaction.isModalSubmit()) {
    await handleModal(interaction);
    return;
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const id = interaction.customId;
  const parts = id.split(":");

  if (parts[0] === "panel-create") {
    await createTicket({ interaction, typeId: parseInt(parts[1], 10) });
    return;
  }

  if (parts[0] === "confirm") {
    const [, action, ticketId] = parts;
    const ticket = getTicket(parseInt(ticketId, 10));
    if (!ticket) {
      await interaction.reply({ content: "Ticket not found.", ephemeral: true });
      return;
    }
    if (action === "close") {
      await openCloseModal(interaction, ticket);
      return;
    }
    if (action === "delete") {
      await finalizeDelete(interaction, ticket);
      return;
    }
    if (action.endsWith("-cancel")) {
      await interaction
        .update({ content: "Cancelled.", embeds: [], components: [], files: [] })
        .catch(() => interaction.reply({ content: "Cancelled.", ephemeral: true, embeds: [], components: [] }));
      return;
    }
    return;
  }

  if (parts[0] === "ticket") {
    const [, action, ticketId] = parts;
    const ticket = getTicket(parseInt(ticketId, 10));
    if (!ticket) {
      await interaction.reply({ content: "Ticket not found.", ephemeral: true });
      return;
    }
    const member = interaction.member as GuildMember | null;
    if (member && interaction.guild) {
      switch (action) {
        case "claim":
          await claimTicket(interaction, ticket);
          return;
        case "unclaim":
          await unclaimTicket(interaction, ticket);
          return;
        case "close":
          await requestClose(interaction, ticket);
          return;
        case "reopen":
          await reopenTicket(interaction, ticket);
          return;
        case "delete":
          await requestDelete(interaction, ticket);
          return;
        case "add":
          await openAddUserModal(interaction, ticket);
          return;
        case "remove":
          await openRemoveUserModal(interaction, ticket);
          return;
        case "rename":
          await openRenameModal(interaction, ticket);
          return;
        case "transcript":
          await exportTranscript(interaction, ticket);
          return;
      }
    }
    await interaction.reply({ content: "Something went wrong.", ephemeral: true });
  }
}

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  const [prefix, action, ticketIdStr] = interaction.customId.split(":");
  if (prefix !== "modal") return;
  const ticket = getTicket(parseInt(ticketIdStr, 10));
  if (!ticket) {
    await interaction.reply({ content: "Ticket not found.", ephemeral: true });
    return;
  }
  switch (action) {
    case "close":
      await submitCloseModal(interaction, ticket);
      return;
    case "add": {
      const input = interaction.fields.getTextInputValue("user");
      await addUser(interaction, ticket, input);
      return;
    }
    case "remove": {
      const input = interaction.fields.getTextInputValue("user");
      await removeUser(interaction, ticket, input);
      return;
    }
    case "rename":
      await submitRename(interaction, ticket);
      return;
    default:
      await interaction.reply({ content: "Unknown modal.", ephemeral: true });
  }
}