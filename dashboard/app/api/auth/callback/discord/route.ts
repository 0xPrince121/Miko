import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, getUser } from "@/lib/discord";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=auth_cancelled", req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    const user = await getUser(tokens.access_token);
    await setSession({
      sub: user.id,
      at: tokens.access_token,
      rt: tokens.refresh_token,
    });
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (err) {
    console.error("[dashboard] oauth callback error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", req.url));
  }
}