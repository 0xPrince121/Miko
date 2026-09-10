"use client";

import { useEffect, useState } from "react";
import { fetchGuild, type GuildPayload, type TicketTypeDto } from "@/lib/api-types";
import { Field, PageHeader, SaveBar, Section, Spinner } from "@/components/ui";
import { Select } from "@/components/Select";
import { Icon } from "@/components/icons";

export function Panel({ guildId }: { guildId: string }) {
  const [data, setData] = useState<GuildPayload | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    panel_title: "Need Help? 💙",
    panel_description:
      "Create a ticket and our support team will help you as soon as possible. Choose the appropriate option below to get started.",
    panel_emoji: "🎫",
    button_name: "Create Ticket",
    button_emoji: "🎫",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [types, setTypes] = useState<TicketTypeDto[]>([]);
  const [activeType, setActiveType] = useState<TicketTypeDto | null>(null);

  useEffect(() => {
    fetchGuild(guildId)
      .then((g) => {
        setData(g);
        setForm({
          panel_title: g.config.panel_title,
          panel_description: g.config.panel_description,
          panel_emoji: g.config.panel_emoji,
          button_name: g.config.button_name,
          button_emoji: g.config.button_emoji,
        });
        setTypes(g.types);
        setActiveType(g.types[0] ?? null);
      })
      .catch((e: Error) => setError(e.message));
  }, [guildId]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <Spinner label="Loading panel editor…" />;

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/guild/${guildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "panel", data: form }),
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
        title="Ticket Panel"
        description="Edit the panel message and its buttons, then deploy it to your channel."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Message" description="The embed users see when they open the panel channel.">
          <div className="space-y-5">
            <div className="grid grid-cols-[72px_1fr] gap-4">
              <Field label="Emoji" hint="Prefix shown icon">
                <input className="input text-center text-xl" value={form.panel_emoji} onChange={(e) => set("panel_emoji")(e.target.value)} maxLength={8} />
              </Field>
              <Field label="Title">
                <input className="input" value={form.panel_title} onChange={(e) => set("panel_title")(e.target.value)} maxLength={256} />
              </Field>
            </div>
            <Field label="Description">
              <textarea className="input min-h-24" value={form.panel_description} onChange={(e) => set("panel_description")(e.target.value)} maxLength={4096} />
            </Field>
          </div>
        </Section>

        <Section title="Button" description="The primary button under the embed (single-type panels).">
          <div className="space-y-5">
            <div className="grid grid-cols-[72px_1fr] gap-4">
              <Field label="Emoji">
                <input className="input text-center text-xl" value={form.button_emoji} onChange={(e) => set("button_emoji")(e.target.value)} maxLength={8} />
              </Field>
              <Field label="Button name">
                <input className="input" value={form.button_name} onChange={(e) => set("button_name")(e.target.value)} maxLength={80} />
              </Field>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3 text-[12.5px] text-muted">
              <Icon name="sparkles" size={15} className="shrink-0 text-brand-hover" />
              With more than one ticket type, each type becomes its own button.
            </div>
          </div>
        </Section>
      </div>

      <Section title="Live Preview" description="This is exactly what your members will see after you deploy the panel.">
        <DiscordPreview form={form} types={types} />
      </Section>

      <Section title="Ticket Types" description="Each type becomes its own panel button. Give a type its own category or support role.">
        <TypesManager
          guildId={guildId}
          types={types}
          activeType={activeType}
          setTypes={setTypes}
          setActiveType={setActiveType}
          data={data}
        />
      </Section>

      <SaveBar onSave={save} saving={saving} saved={saved} error={saveError} />
    </div>
  );
}

function DiscordPreview({
  form,
  types,
}: {
  form: { panel_title: string; panel_description: string; panel_emoji: string; button_name: string; button_emoji: string };
  types: TicketTypeDto[];
}) {
  const title = form.panel_emoji ? `${form.panel_emoji} ${form.panel_title}` : form.panel_title;
  return (
    <div className="rounded-2xl border border-line bg-[#313338] p-4 shadow-inner">
      <div className="flex items-center gap-2 rounded-lg bg-[#2b2d31] px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#313338] text-[11px] font-extrabold text-white ring-1 ring-line">
          M
        </div>
        <div className="text-xs text-[#dbdee1]">
          <span className="font-semibold text-white">Miko</span>
          <span className="ml-1.5 text-[#949ba4]">
            App · Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div className="mt-2 rounded-lg border-l-4 border-[#f0667a] bg-[#2b2d31] px-4 py-4">
        <div className="mb-1 text-[#949ba4]">
          <span className="font-semibold text-[#dbdee1]">Miko</span>
          <span className="text-[#949ba4]"> · Support</span>
        </div>
        <div className="text-[18px] font-bold leading-snug text-white">{title}</div>
        <div className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-[#dbdee1]">{form.panel_description}</div>
      </div>

      {types.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-3 text-center text-xs text-[#949ba4]">
          No ticket types yet — deploy to auto-create “General Support”.
        </p>
      ) : types.length === 1 ? (
        <div className="mt-3 flex">
          <button className="rounded-full bg-[#da373c] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#a12728]">
            {form.button_emoji || types[0].emoji} {form.button_name}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {types.map((t) => (
            <button key={t.id} className="rounded-full bg-[#da373c] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#a12728]">
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypesManager({
  guildId,
  types,
  activeType,
  setTypes,
  setActiveType,
  data,
}: {
  guildId: string;
  types: TicketTypeDto[];
  activeType: TicketTypeDto | null;
  setTypes: (t: TicketTypeDto[]) => void;
  setActiveType: (t: TicketTypeDto | null) => void;
  data: GuildPayload;
}) {
  const [busy, setBusy] = useState<"add" | "update" | "delete" | null>(null);
  const [typeError, setTypeError] = useState("");

  async function mutate(action: "add" | "update" | "delete", type?: Partial<TicketTypeDto>) {
    setBusy(action);
    setTypeError("");
    try {
      const res = await fetch(`/api/guild/${guildId}/types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type }),
      });
      const body = (await res.json()) as { ok?: boolean; types?: TicketTypeDto[]; error?: string };
      if (body.ok && body.types) {
        setTypes(body.types);
        if (action === "delete" && activeType && type?.id === activeType.id) {
          setActiveType(body.types[0] ?? null);
        }
        if (action === "add") setActiveType(body.types[body.types.length - 1] ?? null);
      } else {
        setTypeError(body.error ?? "Failed to save ticket type.");
      }
    } catch {
      setTypeError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const categories = data.channels.categories;
  const roles = [...data.roles].filter((r) => r.id !== data.guild.id);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full space-y-2 lg:w-60">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Types</div>
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveType(t)}
            className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13.5px] transition-colors ${
              activeType?.id === t.id
                ? "border-brand/60 bg-brand/10 text-white"
                : "border-line bg-surface-2/40 text-soft hover:border-line-strong hover:text-white"
            }`}
          >
            <span className="text-base leading-none">{t.emoji}</span>
            <span className="truncate font-medium">{t.name}</span>
          </button>
        ))}
        <button
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-2.5 text-[13px] font-medium text-muted transition-colors hover:border-brand/60 hover:text-brand-hover"
          onClick={() => setActiveType({ id: 0, guild_id: guildId, name: "", emoji: "🎫", description: "", category_id: "", support_role: "", sort: 0 })}
        >
          <Icon name="plus" size={14} />
          Add type
        </button>
      </div>

      <div className="min-w-0 flex-1">
        {activeType ? (
          <div className="animate-fade-in space-y-5 rounded-2xl border border-line bg-surface-2/30 p-5">
            <TypeFields
              key={activeType.id}
              type={activeType}
              categories={categories}
              roles={roles}
              onChange={(patch) => setActiveType({ ...activeType, ...patch })}
            />
            {typeError ? <p className="text-xs font-medium text-red-400">{typeError}</p> : null}
            <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
              {activeType.id !== 0 ? (
                <button
                  className="btn btn-danger"
                  disabled={busy !== null}
                  onClick={() => mutate("delete", activeType)}
                >
                  Delete
                </button>
              ) : null}
              <button
                className="btn btn-primary"
                disabled={busy !== null || !activeType.name.trim()}
                onClick={() => mutate(activeType.id !== 0 ? "update" : "add", activeType)}
              >
                {busy === "add" || busy === "update" ? "Saving…" : activeType.id !== 0 ? "Save type" : "Create type"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <Icon name="panel" size={22} className="mx-auto text-muted" />
            <p className="mt-3 text-sm text-muted">
              Select a ticket type to edit it, or add a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TypeFields({
  type,
  categories,
  roles,
  onChange,
}: {
  type: TicketTypeDto;
  categories: { id: string; name: string }[];
  roles: { id: string; name: string; position: number }[];
  onChange: (patch: Partial<TicketTypeDto>) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-[64px_1fr] gap-4">
        <Field label="Emoji">
          <input className="input text-center text-xl" value={type.emoji} onChange={(e) => onChange({ emoji: e.target.value })} maxLength={8} />
        </Field>
        <Field label="Name">
          <input className="input" value={type.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={80} placeholder="e.g. Billing Support" />
        </Field>
      </div>
      <Field label="Description" hint="Shown in the ticket channel when it's created.">
        <textarea className="input min-h-20" value={type.description} onChange={(e) => onChange({ description: e.target.value })} maxLength={200} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category override" hint="Required — falls back to the setup category.">
          <Select value={type.category_id} onChange={(v) => onChange({ category_id: v })} options={categories.map((c) => ({ value: c.id, label: c.name }))} emptyLabel="Use setup category" />
        </Field>
        <Field label="Support role override" hint="Required — falls back to the staff setup role.">
          <Select value={type.support_role} onChange={(v) => onChange({ support_role: v })} options={roles.map((r) => ({ value: r.id, label: r.name }))} emptyLabel="Use setup role" />
        </Field>
      </div>
    </>
  );
}