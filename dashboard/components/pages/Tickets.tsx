"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchGuild, type GuildPayload, type TicketDto } from "@/lib/api-types";
import { Avatar, EmptyState, PageHeader, Spinner, StatusBadge } from "@/components/ui";

type Filter = "all" | "open" | "closed";

export function Tickets({ guildId }: { guildId: string }) {
  const [data, setData] = useState<GuildPayload | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchGuild(guildId)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [guildId]);

  const tickets = useMemo(() => {
    if (!data) return [];
    let list = data.tickets;
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          String(t.number).includes(q) ||
          t.type_name.toLowerCase().includes(q) ||
          t.creatorName.toLowerCase().includes(q) ||
          t.status.includes(q),
      );
    }
    return list;
  }, [data, filter, query]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <Spinner label="Loading tickets…" />;

  const counts = { all: data.stats.total, open: data.stats.open, closed: data.stats.closed };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Every ticket opened in this server, in one place."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-xl border border-line bg-surface p-1">
          {(["all", "open", "closed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
                filter === f ? "bg-brand text-white shadow-sm" : "text-muted hover:text-white"
              }`}
            >
              {f}
              <span className={`ml-1.5 text-[11px] ${filter === f ? "text-white/80" : "text-muted/70"}`}>{counts[f]}</span>
            </button>
          ))}
        </div>

        <input
          className="input w-full sm:w-64"
          placeholder="Search number, type, user…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tickets"
        />
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon="tickets"
          title={query ? "No matching tickets" : "No tickets here yet"}
          text={
            query
              ? "Try a different search or filter."
              : "New tickets will appear here automatically once members open them."
          }
        />
      ) : (
        <div className="table-shell animate-fade-in">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>User</th>
                <th>Type</th>
                <th>Status</th>
                <th>Claimed by</th>
                <th>Created</th>
                <th>Closed</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: TicketDto }) {
  return (
    <tr>
      <td className="font-bold text-brand-hover">#{ticket.number}</td>
      <td>
        <div className="flex items-center gap-2.5">
          <Avatar src={ticket.creatorAvatarUrl} alt={ticket.creatorName} size={28} />
          <span className="truncate font-medium text-white">{ticket.creatorName}</span>
        </div>
      </td>
      <td className="text-muted">{ticket.type_name}</td>
      <td>
        <StatusBadge status={ticket.status} />
      </td>
      <td>
        {ticket.claimedName ? (
          <div className="flex items-center gap-2.5">
            <Avatar src={ticket.claimedAvatarUrl} alt={ticket.claimedName} size={28} />
            <span className="font-medium text-white">{ticket.claimedName}</span>
          </div>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="text-muted">{dateStr(ticket.created_at)}</td>
      <td className="text-muted">{ticket.closed_at ? dateStr(ticket.closed_at) : "—"}</td>
    </tr>
  );
}

function dateStr(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}