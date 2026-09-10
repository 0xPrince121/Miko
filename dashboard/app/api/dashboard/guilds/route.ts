import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getGuilds, userCanManage, botIsInGuild, BOT_INVITE_URL, type DiscordGuild } from "@/lib/discord";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown")) {
    return NextResponse.json({ error: "Rate limited. Try again shortly." }, { status: 429 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const guilds = (await getGuilds(session.accessToken).catch(() => []))
    .filter(userCanManage)
    .map((g) => ({ ...g }));

  const withBot = await Promise.all(
    guilds.map(async (g) => ({
      ...g,
      botInGuild: await botIsInGuild(g.id).catch(() => false),
      inviteUrl: `${BOT_INVITE_URL()}&guild_id=${g.id}`,
    })),
  );

  withBot.sort((a, b) => (a.botInGuild === b.botInGuild ? 0 : a.botInGuild ? -1 : 1));

  return NextResponse.json({
    user: session.user,
    guilds: withBot as (DiscordGuild & { botInGuild: boolean; inviteUrl: string })[],
  });
}