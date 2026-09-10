import Link from "next/link";
import { readSession } from "@/lib/session";
import { getEnv } from "@/lib/env";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: "panel",
    title: "Ticket panel",
    text: "One-click ticket creation with custom categories and roles.",
  },
  {
    icon: "overview",
    title: "Claim system",
    text: "Staff claims tickets and handles them end-to-end.",
  },
  {
    icon: "tickets",
    title: "HTML transcripts",
    text: "Clean, branded transcripts on every close — plus optional DMs.",
  },
  {
    icon: "settings",
    title: "Simple dashboard",
    text: "Configure everything without touching a line of code.",
  },
] as const;

export default async function Home(props: { searchParams?: Promise<{ error?: string }> }) {
  const searchParams = (await props.searchParams) ?? {};
  const session = await readSession();
  const error = searchParams.error ?? "";

  const loginUrl = getEnv("DASHBOARD_URL", "http://localhost:3000") + "/api/auth/login";

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="animate-fade-up text-center">
          <div className="relative mx-auto mb-8 inline-flex">
            <div className="absolute inset-0 rounded-[26px] bg-brand/40 blur-2xl" />
            <div className="relative flex h-[84px] w-[84px] items-center justify-center rounded-[26px] bg-gradient-to-b from-[#2a76ff] to-brand text-5xl font-extrabold text-white shadow-[0_10px_40px_-6px_rgba(0,87,231,0.7)] ring-1 ring-white/20">
              M
            </div>
          </div>

          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="text-sm font-bold tracking-[0.25em] text-soft">MIKO</span>
            <span className="chip uppercase tracking-widest text-muted">
              <span className="badge-dot bg-brand-hover" />
              Premium Ticket Bot
            </span>
          </div>

          <h1 className="text-[42px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[54px]">
            Need help?
            <br />
            <span className="bg-gradient-to-r from-[#4d8bff] to-brand-hover bg-clip-text text-transparent">
              Miko is here.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15.5px] leading-relaxed text-muted">
            A clean, premium Discord ticket bot. Create, claim, close and transcribe tickets —
            all configured from a tiny dashboard.
          </p>
        </div>

        {error ? (
          <div className="mx-auto mt-7 max-w-sm animate-fade-up rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error === "auth_failed" || error === "auth_cancelled"
              ? "Sign in was cancelled or failed. Please try again."
              : "Something went wrong."}
          </div>
        ) : null}

        <div className="mt-9 flex w-full animate-fade-up flex-col items-center gap-3 [animation-delay:120ms]">
          {session ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg w-72">
              Open Dashboard
              <Icon name="chevron-right" size={17} />
            </Link>
          ) : (
            <a href={loginUrl} className="btn btn-primary btn-lg w-72">
              <DiscordMark />
              Login with Discord
            </a>
          )}
          <p className="text-xs text-muted">Works offline on your own machine — your data stays yours.</p>
        </div>

        <div className="mt-12 grid w-full animate-fade-up grid-cols-1 gap-3 text-left sm:grid-cols-2 [animation-delay:200ms]">
          {features.map((f) => (
            <div
              key={f.title}
              className="card flex items-start gap-3.5 px-4.5 py-4 transition-colors hover:border-white/15"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-hover">
                <Icon name={f.icon} size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-white">{f.title}</div>
                <div className="mt-0.5 text-[13px] leading-snug text-muted">{f.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="pb-8 text-center text-xs text-muted/70">
        Miko · Made with 💙 for your Discord server
      </footer>
    </main>
  );
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.07.07 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  );
}