import { getCurrentSession } from "./auth";
import {
  getGuilds,
  userCanManage,
  type DiscordGuild,
  type DiscordUser,
} from "./discord";

export type GuardResult =
  | { ok: true; user: DiscordUser; guild: DiscordGuild }
  | { ok: false; status: number; error: string };

/**
 * Verifies the user is logged in and can manage the given guild.
 * Server-side permission check — always enforced.
 */
export async function guardGuild(guildId: string): Promise<GuardResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, status: 401, error: "Session expired. Please log in again." };

  const guilds = await getGuilds(session.accessToken).catch(() => []);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return { ok: false, status: 403, error: "You don't manage this server." };
  if (!userCanManage(guild)) return { ok: false, status: 403, error: "You don't have permission to manage this server." };

  return { ok: true, user: session.user, guild };
}