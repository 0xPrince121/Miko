"use client";

import { useEffect, useState } from "react";
import { fetchGuild, type GuildPayload } from "@/lib/api-types";
import { Field, PageHeader, SaveBar, Section, Spinner, Toggle } from "@/components/ui";
import { Select } from "@/components/Select";

export function Settings({ guildId }: { guildId: string }) {
  const [data, setData] = useState<GuildPayload | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    ticket_limit: 0,
    auto_close_days: 0,
    transcript_dm: true,
    require_staff_role: true,
    close_action: "move" as "move" | "delete",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetchGuild(guildId)
      .then((g) => {
        setData(g);
        setForm({
          ticket_limit: g.config.ticket_limit,
          auto_close_days: g.config.auto_close_days,
          transcript_dm: Boolean(g.config.transcript_dm),
          require_staff_role: Boolean(g.config.require_staff_role),
          close_action: g.config.close_action,
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [guildId]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <Spinner label="Loading settings…" />;

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/guild/${guildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "settings", data: form }),
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
        title="Settings"
        description="Global behaviour for how tickets work in this server."
      />

      <Section title="Limits" description="Protect the support queue from spam.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Ticket limit per user" hint="Max concurrent open tickets per user. 0 = unlimited.">
            <input
              type="number"
              min={0}
              className="input num-input"
              value={form.ticket_limit}
              onChange={(e) => setForm({ ...form, ticket_limit: Math.max(0, parseInt(e.target.value || "0", 10)) })}
            />
          </Field>
          <Field label="Auto-close days" hint="Automatically close tickets left untouched for this many days. 0 = off.">
            <input
              type="number"
              min={0}
              className="input num-input"
              value={form.auto_close_days}
              onChange={(e) => setForm({ ...form, auto_close_days: Math.max(0, parseInt(e.target.value || "0", 10)) })}
            />
          </Field>
        </div>
      </Section>

      <Section title="Behavior" description="What happens when a ticket closes — and who gets the transcript.">
        <div className="space-y-5">
          <SettingToggle
            title="DM the transcript"
            hint="Send the closing HTML transcript to the ticket creator's DMs."
            checked={form.transcript_dm}
            onChange={(v) => setForm({ ...form, transcript_dm: v })}
          />
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-line bg-surface-2/50 p-4">
            <div>
              <div className="text-sm font-medium text-white">After closing</div>
              <p className="mt-0.5 text-[13px] text-muted">
                Move the channel to the closed category, or delete it entirely.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={form.close_action}
                onChange={(v) => setForm({ ...form, close_action: v === "delete" ? "delete" : "move" })}
                options={[
                  { value: "move", label: "Move to closed category" },
                  { value: "delete", label: "Delete the channel" },
                ]}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Staff permissions" description="Who is allowed to manage tickets.">
        <SettingToggle
          title="Require the support role"
          hint={
            form.require_staff_role
              ? "Only members with the configured support role can claim, close and manage tickets."
              : "Anyone with the Manage Channels permission is treated as staff."
          }
          checked={form.require_staff_role}
          onChange={(v) => setForm({ ...form, require_staff_role: v })}
        />
      </Section>

      <SaveBar onSave={save} saving={saving} saved={saved} error={saveError} />
    </div>
  );
}

function SettingToggle({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}