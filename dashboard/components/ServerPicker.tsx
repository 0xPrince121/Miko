"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { fetchGuilds, type GuildsPayload } from "@/lib/api-types";
import { Avatar, Spinner } from "./ui";
import { Icon } from "./icons";

export function ServerPicker() {
  const [data, setData] = useState<GuildsPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGuilds()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-4xl">🔐</div>
        <p className="text-sm text-muted">{error}</p>
        <a href="/api/auth/login" className="btn btn-primary">
          Re-authenticate
        </a>
      </div>
    );
  }

  if (!data) return <Spinner label="Finding your servers…" />;

  const manageable = data.guilds;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-lg font-extrabold text-white shadow-[0_4px_24px_-4px_rgba(0,87,231,0.6)]">
            M
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">Choose a server</h1>
            <p className="mt-0.5 text-sm text-muted">
              {manageable.length} server{manageable.length === 1 ? "" : "s"} you can manage
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar src={data.user.avatar} alt={data.user.username} size={38} />
          <div className="hidden text-right text-sm sm:block">
            <div className="font-semibold text-white">{data.user.username}</div>
            <a href="/api/auth/logout" className="text-xs text-muted transition-colors hover:text-white">
              Log out
            </a>
          </div>
        </div>
      </header>

      {manageable.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-3xl">🎀</span>
          <div className="font-semibold text-white">No manageable servers</div>
          <p className="max-w-sm text-[13px] text-muted">
            You need <b className="text-white">Manage Server</b> permission to configure Miko. Ask
            your server owner to grant it, or visit a server first.
          </p>
          <a href="https://discord.com/channels/@me" target="_blank" rel="noreferrer" className="btn btn-secondary">
            <Icon name="external" size={15} />
            Open Discord
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {manageable.map((g, i) => (
            <div
              key={g.id}
              className="card card-hover animate-fade-up flex flex-col p-5"
              style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}
            >
              <div className="flex items-center gap-3">
                {g.icon ? (
                  <Image
                    src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`}
                    alt={g.name}
                    width={46}
                    height={46}
                    className="rounded-xl ring-1 ring-line"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-surface-2 text-lg font-bold text-soft ring-1 ring-line">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-white">{g.name}</div>
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      g.botInGuild
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    <span className={`badge-dot ${g.botInGuild ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {g.botInGuild ? "Miko active" : "Not invited"}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                {g.botInGuild ? (
                  <Link href={`/dashboard/${g.id}`} className="btn btn-primary flex-1">
                    Configure
                    <Icon name="chevron-right" size={15} />
                  </Link>
                ) : (
                  <>
                    <a href={g.inviteUrl} target="_blank" rel="noreferrer" className="btn btn-primary flex-1">
                      <Icon name="external" size={15} />
                      Invite Miko
                    </a>
                    <Link href={`/dashboard/${g.id}`} className="btn btn-secondary" aria-label="Continue without inviting">
                      <Icon name="chevron-right" size={15} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}