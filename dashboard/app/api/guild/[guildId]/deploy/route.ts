import { NextResponse, type NextRequest } from "next/server";
import { guardGuild } from "@/lib/guard";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Rate limited." }, { status: 429 });

  const guard = await guardGuild(guildId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const apiKey = getEnv("BOT_API_KEY");
  const botUrl = (getEnv("BOT_API_URL", "http://localhost:3001") || "http://localhost:3001").replace(/\/$/, "");
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "BOT_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const res = await fetch(`${botUrl}/panel/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ guildId }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok: boolean; message?: string } | null;
    return NextResponse.json(data ?? { ok: false, error: "Bot API unreachable." }, { status: res.status });
  } catch (err) {
    console.error("[dashboard] deploy error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not reach the bot. Is the bot running?" },
      { status: 502 },
    );
  }
}