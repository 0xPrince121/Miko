import {
  ActivityType,
  Client,
  GatewayIntentBits,
  type Interaction,
} from "discord.js";
import { required } from "@miko/db";
import { handleInteraction } from "./interactions";
import { registerCommands, registerGuildCommands } from "./commands";
import { startAutoClose } from "./autoclose";

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.on("guildCreate", async (guild) => {
  try {
    await registerGuildCommands(guild);
    console.log(`[miko] commands registered in new server ${guild.id}`);
  } catch (err) {
    console.error(`[miko] failed to register commands in ${guild.id}:`, err);
  }
});

client.on("clientReady", async (c) => {
  c.user.setActivity({
    name: "tickets | /help",
    type: ActivityType.Watching,
  });
  console.log(`[miko] Logged in as ${c.user.tag}`);
  try {
    await registerCommands(c);
    console.log("[miko] slash commands registered");
  } catch (err) {
    console.error("[miko] failed to register slash commands:", err);
  }
  startAutoClose();
});

client.on("interactionCreate", (interaction: Interaction) => {
  handleInteraction(interaction).catch((err) => {
    console.error("[miko] interaction error:", err);
    const reply = async () => {
      try {
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Something went wrong. Please try again.", ephemeral: true });
        }
      } catch {
        /* noop */
      }
    };
    void reply();
  });
});

export async function startBot(): Promise<void> {
  await client.login(required("DISCORD_TOKEN"));
}