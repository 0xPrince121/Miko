import { getEnv, requireEnv } from "./env";

const API = "https://discord.com/api/v10";

export const DISCORD_CLIENT_ID = () => requireEnv("DISCORD_CLIENT_ID");
export const DASHBOARD_URL = () => getEnv("DASHBOARD_URL", "http://localhost:3000");
export const REDIRECT_URI = () =>
  getEnv("DISCORD_REDIRECT_URI", `${DASHBOARD_URL()}/api/auth/callback/discord`);

/** Permissions Miko needs on servers:
 *  ViewChannel | ManageChannels | SendMessages | ManageMessages | EmbedLinks |
 *  AttachFiles | ReadMessageHistory | AddReactions | UseExternalEmojis */
export const BOT_PERMISSIONS =
  (1n << 4n) |
  (1n << 6n) |
  (1n << 10n) |
  (1n << 11n) |
  (1n << 13n) |
  (1n << 14n) |
  (1n << 15n) |
  (1n << 16n) |
  (1n << 18n);

export const BOT_INVITE_URL = () =>
  `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID()}&permissions=${BOT_PERMISSIONS}&scope=bot%20applications.commands`;

export function authorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID(),
    redirect_uri: REDIRECT_URI(),
    response_type: "code",
    scope: "identify guilds",
    prompt: "consent",
  });
  return `${API}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<SessionTokens> {
  return tokenRequest({
    client_id: DISCORD_CLIENT_ID(),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI(),
  });
}

export async function refreshTokens(refreshToken: string): Promise<SessionTokens> {
  return tokenRequest({
    client_id: DISCORD_CLIENT_ID(),
    client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<SessionTokens> {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as SessionTokens;
}

async function discordFetch(path: string, accessToken?: string): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API}${path}`, { headers, cache: "no-store" });
  const data = (await res.json().catch(() => null)) as unknown;
  return { status: res.status, data };
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  botInGuild?: boolean;
  botAdmin?: boolean;
}

export async function getUser(accessToken: string): Promise<DiscordUser> {
  const { data, status } = await discordFetch("/users/@me", accessToken);
  if (status !== 200) throw new Error(`Failed to fetch user (${status})`);
  return data as DiscordUser;
}

export async function getGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const { data, status } = await discordFetch("/users/@me/guilds", accessToken);
  if (status !== 200) return [];
  return data as DiscordGuild[];
}

const MANAGE_GUILD = 0x20;
const ADMINISTRATOR = 0x8;

export function userCanManage(guild: DiscordGuild): boolean {
  const perms = BigInt(guild.permissions ?? "0");
  return guild.owner || (perms & BigInt(MANAGE_GUILD)) !== 0n || (perms & BigInt(ADMINISTRATOR)) !== 0n;
}

// ---- bot-side (server-to-server with the bot token) ------------------------

function botHeaders(): Record<string, string> {
  return { Authorization: `Bot ${requireEnv("DISCORD_TOKEN")}` };
}

export async function botIsInGuild(guildId: string): Promise<boolean> {
  const res = await fetch(`${API}/guilds/${guildId}/members/${DISCORD_CLIENT_ID()}`, {
    headers: botHeaders(),
    cache: "no-store",
  });
  return res.status === 200;
}

export interface BotChannel {
  id: string;
  name: string;
  type: number;
}

export interface BotRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

export async function botGuildChannels(guildId: string): Promise<BotChannel[]> {
  const res = await fetch(`${API}/guilds/${guildId}/channels`, {
    headers: botHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as BotChannel[];
}

export async function botGuildRoles(guildId: string): Promise<BotRole[]> {
  const res = await fetch(`${API}/guilds/${guildId}/roles`, {
    headers: botHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as BotRole[];
}

export async function botGuild(guildId: string): Promise<{ id: string; name: string; icon: string | null } | null> {
  const res = await fetch(`${API}/guilds/${guildId}`, { headers: botHeaders(), cache: "no-store" });
  if (!res.ok) return null;
  const g = (await res.json()) as { id: string; name: string; icon: string | null };
  return { id: g.id, name: g.name, icon: g.icon };
}

export function iconUrl(guild: { id: string; icon: string | null }, size = 128): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}`;
}

export function userAvatar(user: { id: string; avatar: string | null }, size = 64): string {
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;
}

export async function botGuildMember(guildId: string, memberId: string): Promise<{
  user: { id: string; username: string; global_name: string | null; avatar: string | null } | null;
} | null> {
  const res = await fetch(`${API}/guilds/${guildId}/members/${memberId}`, {
    headers: botHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    user: { id: string; username: string; global_name: string | null; avatar: string | null } | null;
  };
}

export async function botResolveMember(guildId: string, memberId: string): Promise<{
  username: string;
  avatarUrl: string;
} | null> {
  const member = await botGuildMember(guildId, memberId);
  if (!member?.user) return null;
  const u = member.user;
  return {
    username: u.global_name ?? u.username,
    avatarUrl: userAvatar({ id: u.id, avatar: u.avatar }),
  };
}