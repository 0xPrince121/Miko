"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "./icons";

export function Avatar({
  src,
  alt,
  size = 36,
}: {
  src?: string | null;
  alt: string;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-muted"
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-full ring-1 ring-line"
      unoptimized
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-head pb-1">
      <div>
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-sub">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2 pt-1">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    closed: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    deleted: "bg-red-500/10 text-red-400 border-red-500/30",
  };
  const dot: Record<string, string> = {
    open: "bg-emerald-400",
    closed: "bg-amber-400",
    deleted: "bg-red-400",
  };
  return (
    <span className={`badge ${map[status] ?? "border-line text-muted"}`}>
      <span className={`badge-dot ${dot[status] ?? "bg-muted"}`} />
      {status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  accent,
  sub,
  icon,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  sub?: string;
  icon?: "open" | "closed" | "total" | "activity";
}) {
  const iconColor = accent ? "bg-brand/15 text-brand-hover" : "bg-white/[0.05] text-muted";
  const glyph =
    icon === "open"
      ? "📨"
      : icon === "closed"
        ? "🔒"
        : icon === "total"
          ? "🗂️"
          : icon === "activity"
            ? "⚡"
            : null;

  return (
    <div className="card card-hover animate-fade-up p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">{label}</div>
        {glyph ? (
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm ${iconColor}`}>
            {glyph}
          </span>
        ) : null}
      </div>
      <div className={`num-input mt-2.5 text-[30px] font-extrabold leading-none tracking-tight ${accent ? "text-brand-hover" : "text-white"}`}>
        {value}
      </div>
      {sub ? <div className="mt-2 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="sheet animate-fade-up p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-white">{title}</h2>
          {description ? <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="toggle"
      data-on={checked}
      onClick={() => onChange(!checked)}
      aria-label={label ?? "toggle"}
      role="switch"
      aria-checked={checked}
    >
      <span className="knob" />
    </button>
  );
}

/**
 * Sticky save bar with success + error feedback.
 * Show "Saved ✓" whenever `saved` changes while not saving.
 */
export function SaveBar({
  onSave,
  saving,
  saved,
  error,
  disabled,
}: {
  onSave: () => void;
  saving: boolean;
  saved?: number;
  error?: string;
  disabled?: boolean;
}) {
  const showSaved = !saving && saved !== undefined && saved > 0;
  return (
    <div className="sticky bottom-4 z-10 mt-2">
      <div className="flex items-center justify-end gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-3 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md">
        {error ? <span className="mr-auto text-xs font-medium text-red-400">{error}</span> : null}
        {showSaved ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Icon name="check" size={14} />
            Saved
          </span>
        ) : null}
        <button type="button" className="btn btn-primary" disabled={saving || disabled} onClick={onSave}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted">
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
        <div className="relative h-full w-full animate-spin rounded-full border-2 border-line border-t-brand" />
      </div>
      <span className="text-sm font-medium text-soft">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = "tickets", title, text }: { icon?: "tickets" | "setup" | "panel" | "pow"; title: string; text?: string }) {
  const glyph = icon === "setup" ? "⚙️" : icon === "panel" ? "🎫" : icon === "pow" ? "🪄" : "🗂️";
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-2 text-2xl">
        {glyph}
      </div>
      <div className="text-sm font-semibold text-white">{title}</div>
      {text ? <div className="max-w-sm text-[13px] leading-relaxed text-muted">{text}</div> : null}
    </div>
  );
}