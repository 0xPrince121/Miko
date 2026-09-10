"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "", label: "Overview", icon: "overview" },
  { href: "/setup", label: "Ticket Setup", icon: "setup" },
  { href: "/panel", label: "Ticket Panel", icon: "panel" },
  { href: "/tickets", label: "Tickets", icon: "tickets" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Shell({
  guildId,
  guildName,
  iconUrl,
  userName,
  userAvatarUrl,
  children,
}: {
  guildId: string;
  guildName: string;
  iconUrl: string | null;
  userName?: string;
  userAvatarUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur-md lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="relative">
            {iconUrl ? (
              <Image
                src={iconUrl}
                alt={guildName}
                width={38}
                height={38}
                className="rounded-xl ring-1 ring-line"
                unoptimized
              />
            ) : (
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-surface-2 text-sm font-bold text-soft ring-1 ring-line">
                {guildName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-white">{guildName}</div>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
              Miko dashboard
            </div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:py-2 lg:pb-0">
          {NAV.map((item) => {
            const active =
              item.href === "" ? pathname === base : pathname.startsWith(`${base}${item.href}`);
            return (
              <Link
                key={item.label}
                href={`${base}${item.href}`}
                className={`group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  active ? "bg-brand/15 text-white" : "text-muted hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand" />
                ) : null}
                <Icon
                  name={item.icon}
                  size={17}
                  className={active ? "text-brand-hover" : "text-muted group-hover:text-soft"}
                />
                {item.label}
              </Link>
            );
          })}

          {/* Compact mobile actions */}
          <Link
            href="/dashboard"
            className="ml-auto flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-muted hover:bg-white/[0.05] hover:text-white lg:hidden"
          >
            <Icon name="servers" size={16} />
            Servers
          </Link>
          <a
            href="/api/auth/logout"
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-muted hover:bg-white/[0.05] hover:text-red-300 lg:hidden"
          >
            <Icon name="logout" size={16} />
            Log out
          </a>
        </nav>

        <div className="hidden px-3 pb-4 pt-3 lg:block">
          <div className="rounded-xl border border-line bg-surface/60 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-soft">
              <Icon name="sparkles" size={14} className="text-brand-hover" />
              Tip
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Share your support role &amp; panel channel in <b className="text-soft">Setup</b> to get
              started.
            </p>
          </div>
        </div>

        <div className="hidden border-t border-line p-3 lg:block">
          {userName ? (
            <div className="mb-1 flex items-center gap-2 rounded-xl px-2 py-1.5">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full ring-1 ring-line"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-soft ring-1 ring-line">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="min-w-0 truncate text-[12px] font-semibold text-soft">{userName}</span>
            </div>
          ) : null}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <Icon name="servers" size={17} />
            Servers
          </Link>
          <a
            href="/api/auth/logout"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-red-300"
          >
            <Icon name="logout" size={17} />
            Log out
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}