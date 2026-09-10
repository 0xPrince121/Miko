import {
  PermissionFlagsBits,
  type GuildMember,
  type GuildTextBasedChannel,
  type Role,
} from "discord.js";
import { getGuildConfig, getTicket, listTicketUsers, userHasTicketAccess } from "@miko/db";
import type { GuildConfig } from "@miko/db";
import type { Guild, RoleResolvable } from "discord.js";

export interface StaffContext {
  isStaff: boolean;
  isCreator: boolean;
  isMember: boolean;
}

function memberPermissions(member: GuildMember): bigint {
  const raw = (member as { permissions?: unknown }).permissions;
  if (typeof raw === "string") return BigInt(raw || "0");
  if (typeof raw === "bigint") return raw;
  if (raw && typeof raw === "object") {
    const bitfield = (raw as { bitfield?: unknown }).bitfield;
    if (typeof bitfield === "bigint") return bitfield;
    if (typeof bitfield === "string" || typeof bitfield === "number") return BigInt(bitfield);
  }
  return 0n;
}

function memberRoleIds(member: GuildMember): Set<string> {
  const roles = (member as { roles?: unknown }).roles as
    | { cache?: Map<string, unknown> | undefined }
    | Array<{ id?: string } | string>
    | undefined;
  if (!roles) return new Set();
  if ("cache" in roles) return new Set(roles.cache?.keys() ?? []);
  if (Array.isArray(roles)) {
    return new Set(roles.map((r) => (typeof r === "string" ? r : (r?.id ?? ""))));
  }
  return new Set();
}

function hasAnyRole(member: GuildMember, roleIds: string[]): boolean {
  const own = memberRoleIds(member);
  return roleIds.some((id) => id && own.has(id));
}

/**
 * Determines whether a member counts as staff.
 * Owners and members with Administrator/ManageGuild are always staff.
 * When `require_staff_role` is enabled, the configured support role is required
 * for everyone else. Otherwise anyone with the Manage Channels permission counts.
 */
export function isStaff(
  member: GuildMember,
  config: GuildConfig,
  extraRoles: string[] = [],
): boolean {
  const roleIds = [config.support_role, ...extraRoles].filter(Boolean);
  const perms = memberPermissions(member);
  const admin =
    (perms & (PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)) !== 0n;
  if (admin) return true;
  if (config.require_staff_role && roleIds.length > 0) return hasAnyRole(member, roleIds);
  if ((perms & PermissionFlagsBits.ManageChannels) !== 0n) return true;
  return roleIds.length > 0 ? hasAnyRole(member, roleIds) : false;
}

export function evaluateAccess(
  member: GuildMember,
  config: GuildConfig,
  typeSupportRoles: string[] = [],
  ticketId?: number,
): StaffContext {
  return {
    isStaff: isStaff(member, config, typeSupportRoles),
    isCreator: ticketId ? member.id === getTicketCreator(ticketId) : false,
    isMember: ticketId ? userHasTicketAccess(ticketId, member.id) : false,
  };
}

function getTicketCreator(ticketId: number): string {
  return getTicket(ticketId)?.creator_id ?? "";
}

/** All user IDs that should have read access to a ticket channel. */
export function ticketAccessUserIds(ticketId: number): string[] {
  return listTicketUsers(ticketId);
}

export function memberIsStaffOrCreator(
  member: GuildMember,
  config: GuildConfig,
  ticketId: number,
): boolean {
  const creator = getTicketCreator(ticketId);
  return member.id === creator || isStaff(member, config);
}

export function requireStaff(
  member: GuildMember,
  config: GuildConfig,
  extraRoles: string[] = [],
): { ok: true } | { ok: false; error: string } {
  if (isStaff(member, config, extraRoles)) return { ok: true };
  return { ok: false, error: "You don't have permission to do that." };
}

export async function resolveRole(
  guild: Guild,
  roleId: string,
): Promise<Role | undefined> {
  if (!roleId) return undefined;
  const role = guild.roles.cache.get(roleId);
  if (role) return role;
  return (await guild.roles.fetch(roleId).catch(() => undefined)) ?? undefined;
}

export function isGuildTextChannel(channel: unknown): channel is GuildTextBasedChannel {
  return Boolean(channel && typeof channel === "object" && "send" in channel);
}

export function parseUserId(input: string): string | null {
  const match = /<@!?(\d+)>/.exec(input.trim());
  if (match) return match[1];
  if (/^\d{17,20}$/.test(input.trim())) return input.trim();
  return null;
}

export function userIsCreatorOrMember(ticket: { creator_id: string }, userId: string): boolean {
  return ticket.creator_id === userId;
}

export type { RoleResolvable };