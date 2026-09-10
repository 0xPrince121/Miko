import { NextResponse, type NextRequest } from "next/server";
import { guardGuild } from "@/lib/guard";
import {
  addTicketType,
  updateTicketType,
  deleteTicketType,
  listTicketTypes,
  type TicketType,
} from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Rate limited." }, { status: 429 });

  const guard = await guardGuild(guildId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as {
    action: "add" | "update" | "delete";
    type?: Partial<TicketType> & { id?: number };
  } | null;
  if (!body?.action) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  try {
    if (body.action === "add") {
      const name = String(body.type?.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
      addTicketType(guildId, {
        name,
        emoji: String(body.type?.emoji ?? "🎫").trim(),
        description: String(body.type?.description ?? "").trim(),
        category_id: String(body.type?.category_id ?? "").trim(),
        support_role: String(body.type?.support_role ?? "").trim(),
      });
    } else if (body.action === "update") {
      const id = Number(body.type?.id);
      if (!id) return NextResponse.json({ error: "Type id required." }, { status: 400 });
      updateTicketType(id, {
        name: typeof body.type?.name === "string" ? body.type.name.trim() : undefined,
        emoji: typeof body.type?.emoji === "string" ? body.type.emoji.trim() : undefined,
        description:
          typeof body.type?.description === "string" ? body.type.description.trim() : undefined,
        category_id:
          typeof body.type?.category_id === "string" ? body.type.category_id.trim() : undefined,
        support_role:
          typeof body.type?.support_role === "string" ? body.type.support_role.trim() : undefined,
      });
    } else if (body.action === "delete") {
      const id = Number(body.type?.id);
      if (!id) return NextResponse.json({ error: "Type id required." }, { status: 400 });
      deleteTicketType(id);
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    console.error("[dashboard] type mutation error:", err);
    return NextResponse.json({ error: "Failed to save ticket types." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, types: listTicketTypes(guildId) });
}