export interface GuildConfigDto {
  guild_id: string;
  ticket_category: string;
  closed_category: string;
  support_role: string;
  log_channel: string;
  transcript_channel: string;
  panel_channel: string;
  require_staff_role: number;
  panel_title: string;
  panel_description: string;
  panel_emoji: string;
  button_name: string;
  button_emoji: string;
  ticket_limit: number;
  auto_close_days: number;
  transcript_dm: number;
  close_action: "move" | "delete";
  panel_message_id: string;
  updated_at: number;
}

export interface TicketTypeDto {
  id: number;
  guild_id: string;
  name: string;
  emoji: string;
  description: string;
  category_id: string;
  support_role: string;
  sort: number;
}

export interface TicketDto {
  id: number;
  number: number;
  guild_id: string;
  channel_id: string;
  type_name: string;
  creator_id: string;
  claimed_by: string | null;
  control_message_id: string;
  status: "open" | "closed" | "deleted";
  created_at: number;
  closed_at: number | null;
  close_reason: string | null;
  creatorName: string;
  creatorAvatarUrl: string;
  claimedName: string | null;
  claimedAvatarUrl: string | null;
}

export interface ChannelDto {
  id: string;
  name: string;
  type: number;
}

export interface RoleDto {
  id: string;
  name: string;
  color: number;
  position: number;
}

export interface GuildPayload {
  guild: { id: string; name: string; icon: string | null; iconUrl: string | null };
  botInGuild: boolean;
  canManage: boolean;
  config: GuildConfigDto;
  types: TicketTypeDto[];
  stats: { open: number; closed: number; deleted: number; total: number; inProgress: number };
  tickets: TicketDto[];
  channels: {
    all: ChannelDto[];
    categories: ChannelDto[];
    textChannels: ChannelDto[];
  };
  roles: RoleDto[];
}

export interface GuildsPayload {
  user: { id: string; username: string; avatar: string | null; global_name: string | null };
  guilds: {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    botInGuild: boolean;
    inviteUrl: string;
  }[];
}

export async function fetchGuild(guildId: string): Promise<GuildPayload> {
  const res = await fetch(`/api/guild/${guildId}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Failed to load server (${res.status})`);
  }
  return res.json();
}

export async function fetchGuilds(): Promise<GuildsPayload> {
  const res = await fetch("/api/dashboard/guilds", { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load servers");
  }
  return res.json();
}

export function channelName(id: string, channels: ChannelDto[]): string {
  return channels.find((c) => c.id === id)?.name ?? (id ? "Unknown channel" : "Not set");
}

export function roleName(id: string, roles: RoleDto[]): string {
  return roles.find((r) => r.id === id)?.name ?? (id ? "Unknown role" : "Not set");
}