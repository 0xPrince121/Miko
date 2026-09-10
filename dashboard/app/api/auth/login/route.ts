import { NextResponse } from "next/server";
import { authorizationUrl } from "@/lib/discord";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.redirect(authorizationUrl());
}