"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchGuild, channelName, type GuildPayload } from "@/lib/api-types";
import { Avatar, EmptyState, PageHeader, Spinner, StatCard, StatusBadge, Section } from "@/components/ui";
import { Icon } from "@/components/icons";

export function Overview({ guildId }: { guildId: string }) {
  const [data, setData] = useState<GuildPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGuild(guildId)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [guildId]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner label="Loading overview…" />;

  const { stats, config, tickets } = data;
  const recent = tickets.slice(0, 5);
  const needsSetup = !config.panel_channel || !config.support_role;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Overview`}
        description={`Everything happening in this server at a glance.`}
        actions={
          needsSetup && data.botInGuild ? (
            <Link href={`/dashboard/${guildId}/setup`} className="btn btn-primary">
              <Icon name="setup" size={16} />
              Set up now
            </Link>
          ) : undefined
        }
      />

      {!data.botInGuild ? (
        <div className="animate-fade-up flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-semibold text-amber-200">Miko is not in this server</div>
              <p className="text-[13px] text-amber-200/60">Invite the bot to enable the ticket panel.</p>
            </div>
          </div>
          <Link href="/dashboard" className="btn btn-secondary">
            Invite Miko
          </Link>
        </div>
      ) : null}

      {needsSetup && data.botInGuild ? (
        <div className="animate-fade-up flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-brand/[0.08] p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <div className="font-semibold text-white">Miko needs a little setup</div>
              <p className="text-[13px] text-muted">Pick a support role and a panel channel to get started.</p>
            </div>
          </div>
          <Link href={`/dashboard/${guildId}/setup`} className="btn btn-primary">
            Set up now →
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open" value={stats.open} accent icon="open" sub="waiting on staff" />
        <StatCard label="Closed" value={stats.closed} icon="closed" sub="all time" />
        <StatCard label="Total" value={stats.total} icon="total" sub="including removed" />
        <StatCard
          label="Recent Activity"
          value={recent.length > 0 ? since(recent[0].created_at) : "—"}
          icon="activity"
          sub={recent.length > 0 ? "since last ticket" : "no tickets yet"}
        />
      </div>

      <Section
        title="Recent Activity"
        description="The most recent tickets in this server."
        actions={
          recent.length > 0 ? (
            <Link href={`/dashboard/${guildId}/tickets`} className="btn btn-secondary btn-sm">
              View all
              <Icon name="chevron-right" size={14} />
            </Link>
          ) : undefined
        }
      >
        {recent.length === 0 ? (
          <EmptyState
            icon="panel"
            title="No tickets yet"
            text="Deploy the ticket panel below and your members can open their first ticket."
          />
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <Avatar src={t.creatorAvatarUrl} alt={t.creatorName} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">
                    <span className="font-bold text-brand-hover">#{t.number}</span>
                    <span className="text-muted"> · </span>
                    {t.type_name}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {t.creatorName} · {timeAgo(t.created_at)}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Ticket Panel" description="Deploy the panel message to your configured channel.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13.5px] text-muted">
            <Icon name="panel" size={16} className="text-brand-hover" />
            Panel channel:
            <b className="text-white">
              {config.panel_channel ? `#${channelName(config.panel_channel, data.channels.all)}` : "Not set"}
            </b>
          </div>
          <DeployButton guildId={guildId} />
        </div>
      </Section>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="card m-8 flex flex-col items-center gap-3 p-10 text-center">
      <span className="text-3xl">⚠️</span>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

function since(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h`;
  return `${Math.max(1, Math.floor(diff / 60000))}m`;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function DeployButton({ guildId }: { guildId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function deploy() {
    setState("loading");
    setMessage("");
    try {
      const res = await fetch(`/api/guild/${guildId}/deploy`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (body.ok) {
        setState("done");
        setMessage(body.message ?? "Panel deployed.");
      } else {
        setState("error");
        setMessage(body.error ?? body.message ?? "Deploy failed.");
      }
    } catch {
      setState("error");
      setMessage("Could not reach the bot.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {state === "done" ? (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <Icon name="check" size={13} />
          {message}
        </span>
      ) : null}
      {state === "error" ? <span className="text-xs font-semibold text-red-400">{message}</span> : null}
      <button
        className={`btn ${state === "error" ? "btn-danger" : "btn-primary"}`}
        onClick={deploy}
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          "Deploying…"
        ) : (
          <>
            <Icon name="sparkles" size={15} />
            Deploy Panel
          </>
        )}
      </button>
    </div>
  );
}