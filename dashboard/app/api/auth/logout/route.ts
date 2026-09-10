import { NextResponse, type NextRequest } from "next/server";
import { clearSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/", req.url));
}

export const POST = GET;