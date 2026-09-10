import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  type ApplicationCommandDataResolvable,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildMember,
} from "discord.js";
import { getGuildConfig } from "@miko/db";
import { deployPanel, removePanel } from "./panel";
import { isStaff } from "./permissions";
import { embed, PRIMARY_COLOR } from "./constants";

const COMMAND_DEFS: ApplicationCommandDataResolvable[] = [
  {
    type: ApplicationCommandType.ChatInput,
    name: "panel",
    description: "Manage Miko's ticket panel",
    options: [
      {
        name: "deploy",
        description: "Post (or refresh) the ticket panel in the configured channel",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "remove",
        description: "Delete the current ticket panel message",
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },
  {
    type: ApplicationCommandType.ChatInput,
    name: "help",
    description: "Learn how Miko works",
  },
];

export async function registerGuildCommands(guild: Guild): Promise<void> {
  await guild.commands.set(COMMAND_DEFS);
}

export async function registerCommands(client: Client): Promise<void> {
  await Promise.all(
    [...client.guilds.cache.values()].map((g) =>
      g.commands
        .set(COMMAND_DEFS)
        .then(() => true)
        .catch((err) => {
          console.error(`[miko] could not register commands in ${g.id}:`, err?.message ?? err);
          return false;
        }),
    ),
  );
}

export async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.commandName === "help") {
    await interaction.reply({
      embeds: [
        embed(
          "Miko Help",
          "Miko manages support tickets via buttons inside dedicated ticket channels.\n\n**Getting started:**\n1. Open the dashboard (`" +
            (process.env.DASHBOARD_URL ?? "http://localhost:3000") +
            "`) and complete **Setup** — pick a support role and a panel channel.\n2. Run `/panel deploy` (or click **Deploy Panel** in the dashboard).\n3. Members click the button to open a ticket. Staff can claim, close and transcribe from the buttons in the ticket channel.",
          PRIMARY_COLOR,
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "panel") {
    if (!interaction.guild) {
      await interaction.reply({ content: "This can only be used inside a server.", ephemeral: true });
      return;
    }
    const config = getGuildConfig(interaction.guild.id);
    const member = interaction.member as GuildMember | undefined;
    if (!member || !isStaff(member, config)) {
      await interaction.reply({ content: "Only staff can manage the panel.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    if (sub === "remove") {
      const result = await removePanel(interaction.guild);
      await interaction.reply({ content: `${result.ok ? "✅" : "❌"} ${result.message}`, ephemeral: true });
      return;
    }

    const result = await deployPanel(interaction.guild);
    await interaction.reply({ content: `${result.ok ? "✅" : "❌"} ${result.message}`, ephemeral: true });
    return;
  }
}