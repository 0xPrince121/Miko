"use client";

import { useEffect, useState } from "react";
import { fetchGuild, type GuildPayload } from "@/lib/api-types";
import { EmptyState, Field, PageHeader, SaveBar, Section, Spinner } from "@/components/ui";
import { Select } from "@/components/Select";

export function Setup({ guildId }: { guildId: string }) {
  const [data, setData] = useState<GuildPayload | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetchGuild(guildId)
      .then((g) => {
        setData(g);
        setForm({
          ticket_category: g.config.ticket_category,
          closed_category: g.config.closed_category,
          support_role: g.config.support_role,
          log_channel: g.config.log_channel,
          transcript_channel: g.config.transcript_channel,
          panel_channel: g.config.panel_channel,
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [guildId]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <Spinner label="Loading setup…" />;

  const { categories, textChannels } = data.channels;
  const roles = [...data.roles].filter((r) => r.id !== data.guild.id).sort((a, b) => b.position - a.position);

  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/guild/${guildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "setup", data: form }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(body.error ?? "Failed to save. Please try again.");
        return;
      }
      setSaved(Date.now());
    } catch {
      setSaveError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticket Setup"
        description="Choose where tickets live, who can help, and where logs & transcripts go."
      />

      {!data.botInGuild ? (
        <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="text-sm font-semibold text-amber-200">Miko isn't in this server yet</div>
              <p className="text-[13px] text-amber-200/60">
                Invite the bot first so the channels and roles below appear.
              </p>
            </div>
          </div>
          <a href="/dashboard" className="btn btn-secondary">
            Go to servers
          </a>
        </div>
      ) : null}

      <Section
        title="Categories"
        description="New tickets are created inside the ticket category. Closed tickets move to the closed category."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Ticket category" hint="Where open ticket channels are created.">
            <Select value={form.ticket_category} onChange={set("ticket_category")} options={categoryOptions(categories)} emptyLabel="No category" />
          </Field>
          <Field label="Closed category" hint="Where closed tickets are moved to.">
            <Select value={form.closed_category} onChange={set("closed_category")} options={categoryOptions(categories)} emptyLabel="No category" />
          </Field>
        </div>
      </Section>

      <Section title="Staff" description="The role that can claim, close and manage tickets.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Support role" hint="Members with this role are treated as staff.">
            <Select
              value={form.support_role}
              onChange={set("support_role")}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              emptyLabel="No support role"
            />
          </Field>
        </div>
      </Section>

      <Section title="Channels" description="Logs and transcripts are posted here when tickets are created or closed.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Log channel" hint="Ticket created / claimed / closed events.">
            <Select
              value={form.log_channel}
              onChange={set("log_channel")}
              options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
              emptyLabel="No log channel"
            />
          </Field>
          <Field label="Transcript channel" hint="HTML transcripts are sent here on close.">
            <Select
              value={form.transcript_channel}
              onChange={set("transcript_channel")}
              options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
              emptyLabel="No transcript channel"
            />
          </Field>
          <Field label="Panel channel" hint="The message with the Create Ticket button.">
            <Select
              value={form.panel_channel}
              onChange={set("panel_channel")}
              options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
              emptyLabel="No panel channel"
            />
          </Field>
        </div>
      </Section>

      {data.channels.all.length === 0 && data.botInGuild ? (
        <EmptyState
          icon="setup"
          title="No channels found"
          text="Miko may not have cached this server yet. Try again in a few seconds."
        />
      ) : null}

      <SaveBar onSave={save} saving={saving} saved={saved} error={saveError} />
    </div>
  );
}

function categoryOptions(categories: { id: string; name: string }[]) {
  return categories.map((c) => ({ value: c.id, label: c.name }));
}