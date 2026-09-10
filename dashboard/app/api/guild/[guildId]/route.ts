import { NextResponse, type NextRequest } from "next/server";
import { guardGuild } from "@/lib/guard";
import {
  getGuildConfig,
  saveGuildConfig,
  getTicketStats,
  listTickets,
  listTicketTypes,
  type GuildConfig,
  type Ticket,
} from "@/lib/db";
import {
  botIsInGuild,
  botGuildChannels,
  botGuildRoles,
  botResolveMember,
  iconUrl,
} from "@/lib/discord";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function ipOf(req: NextRequest): Promise<string> {
  return req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const ip = await ipOf(req);
  if (!rateLimit(ip)) return NextResponse.json({ error: "Rate limited." }, { status: 429 });

  const guard = await guardGuild(guildId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const [config, types, stats, tickets, channels, roles, botInGuild] = await Promise.all([
    Promise.resolve(getGuildConfig(guildId)),
    Promise.resolve(listTicketTypes(guildId)),
    Promise.resolve(getTicketStats(guildId)),
    Promise.resolve(listTickets(guildId)),
    botGuildChannels(guildId).catch(() => []),
    botGuildRoles(guildId).catch(() => []),
    botIsInGuild(guildId).catch(() => false),
  ]);

  const categories = channels.filter((c) => c.type === 4);
  const textChannels = channels.filter((c) => c.type === 0);

  // Resolve display names for ticket creators / claimed staff (best effort).
  const ids = new Set<string>();
  for (const t of tickets.slice(0, 100)) {
    ids.add(t.creator_id);
    if (t.claimed_by) ids.add(t.claimed_by);
  }
  const names = new Map<string, { username: string; avatarUrl: string }>();
  await Promise.all(
    [...ids].slice(0, 60).map(async (id) => {
      const member = await botResolveMember(guildId, id).catch(() => null);
      if (member) names.set(id, member);
    }),
  );

  const enriched: (Ticket & {
    creatorName: string;
    creatorAvatarUrl: string;
    claimedName: string | null;
    claimedAvatarUrl: string | null;
  })[] = tickets.map((t) => {
    const creator = names.get(t.creator_id);
    const claimed = t.claimed_by ? names.get(t.claimed_by) : null;
    return {
      ...t,
      creatorName: creator?.username ?? t.creator_id,
      creatorAvatarUrl: creator?.avatarUrl ?? "",
      claimedName: claimed?.username ?? t.claimed_by,
      claimedAvatarUrl: claimed?.avatarUrl ?? null,
    };
  });

  return NextResponse.json({
    guild: {
      id: guildId,
      name: guard.guild.name,
      icon: guard.guild.icon,
      iconUrl: iconUrl({ id: guard.guild.id, icon: guard.guild.icon }),
    },
    botInGuild,
    canManage: true,
    config,
    types,
    stats,
    tickets: enriched,
    channels: { all: channels, categories, textChannels },
    roles,
  });
}

const SECTIONS: Record<string, string[]> = {
  setup: [
    "ticket_category",
    "closed_category",
    "support_role",
    "log_channel",
    "transcript_channel",
    "panel_channel",
  ],
  panel: ["panel_title", "panel_description", "panel_emoji", "button_name", "button_emoji"],
  settings: ["ticket_limit", "auto_close_days", "transcript_dm", "require_staff_role", "close_action"],
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const ip = await ipOf(req);
  if (!rateLimit(ip)) return NextResponse.json({ error: "Rate limited." }, { status: 429 });

  const guard = await guardGuild(guildId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as {
    section?: string;
    data?: Record<string, unknown>;
  } | null;
  if (!body?.section || !body.data) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const allowed = SECTIONS[body.section];
  if (!allowed) return NextResponse.json({ error: "Unknown section." }, { status: 400 });

  const patch: Partial<GuildConfig> = {};
  for (const key of Object.keys(body.data)) {
    if (!allowed.includes(key)) continue;
    const value = body.data[key];
    if (typeof value === "string") {
      (patch as Record<string, string>)[key] = value.trim();
    } else if (typeof value === "number" || typeof value === "boolean") {
      (patch as Record<string, number | boolean>)[key] = value;
    }
  }

  const config = saveGuildConfig(guildId, patch);
  return NextResponse.json({ ok: true, config });
}