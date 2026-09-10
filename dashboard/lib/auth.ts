import { readSession, setSession, type SessionPayload } from "./session";
import { getUser, refreshTokens, type DiscordUser } from "./discord";

/**
 * Returns the logged-in Discord user, transparently refreshing the access token
 * when it expired. Returns null when the user isn't authenticated.
 */
export async function getCurrentUser(): Promise<DiscordUser | null> {
  const result = await getCurrentSession();
  return result?.user ?? null;
}

/**
 * Returns the logged-in user together with a fresh access token,
 * transparently refreshing when the token expired.
 */
export async function getCurrentSession(): Promise<{ user: DiscordUser; accessToken: string } | null> {
  const session = await readSession();
  if (!session) return null;
  try {
    return { user: await getUser(session.at), accessToken: session.at };
  } catch {
    try {
      const tokens = await refreshTokens(session.rt);
      await setSession({
        sub: session.sub,
        at: tokens.access_token,
        rt: tokens.refresh_token || session.rt,
      });
      return { user: await getUser(tokens.access_token), accessToken: tokens.access_token };
    } catch {
      return null;
    }
  }
}

export function isTokenError(err: unknown): boolean {
  return err instanceof Error && /Failed to fetch user/.test(err.message);
}

export type { SessionPayload };