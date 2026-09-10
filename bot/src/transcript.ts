import type { Message, TextBasedChannel } from "discord.js";
import type { Ticket } from "@miko/db";

export interface TranscriptMsg {
  author: { id: string; tag: string; avatarUrl: string };
  content: string;
  timestamp: number;
  attachments: { name: string; url: string }[];
  embeds: { title: string; description: string }[];
}

export async function collectMessages(channel: TextBasedChannel, max = 10000): Promise<Message[]> {
  const messages: Message[] = [];
  let beforeId: string | undefined;
  for (;;) {
    const page = await channel.messages.fetch({ limit: 100, before: beforeId });
    const batch = [...page.values()];
    if (batch.length === 0) break;
    messages.push(...batch);
    if (messages.length >= max) break;
    beforeId = batch[batch.length - 1].id;
    if (page.size < 100) break;
  }
  return messages.reverse();
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toTranscriptMsg(msg: Message): TranscriptMsg {
  const avatarUrl =
    msg.author.displayAvatarURL({ extension: "png", size: 64 }) ??
    msg.author.defaultAvatarURL;
  return {
    author: { id: msg.author.id, tag: msg.author.tag, avatarUrl },
    content: msg.content,
    timestamp: msg.createdTimestamp,
    attachments: msg.attachments.map((a) => ({ name: a.name, url: a.url })),
    embeds: msg.embeds.map((e) => ({
      title: e.title ?? "",
      description: e.description ?? "",
    })),
  };
}

function renderMessages(msgs: TranscriptMsg[]): string {
  if (msgs.length === 0) {
    return `<div class="empty">No messages were sent in this ticket.</div>`;
  }
  return msgs
    .filter((m) => m.content || m.attachments.length > 0 || m.embeds.length > 0)
    .map((m) => {
      const time = new Date(m.timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const attach = m.attachments
        .map(
          (a) =>
            `<div class="attachment"><a href="${esc(a.url)}" target="_blank" rel="noreferrer">📎 ${esc(a.name)}</a></div>`,
        )
        .join("");
      const emb = m.embeds
        .filter((e) => e.title || e.description)
        .map(
          (e) =>
            `<div class="msg-embed">${e.title ? `<div class="msg-embed-title">${esc(e.title)}</div>` : ""}${
              e.description ? `<div class="msg-embed-desc">${esc(e.description)}</div>` : ""
            }</div>`,
        )
        .join("");
      return `
        <div class="msg">
          <img class="avatar" src="${esc(m.author.avatarUrl)}" alt="">
          <div class="msg-body">
            <div class="msg-meta"><span class="author">${esc(m.author.tag)}</span><span class="time">${esc(time)}</span></div>
            ${m.content ? `<div class="content">${esc(m.content)}</div>` : ""}
            ${attach}
            ${emb}
          </div>
        </div>`;
    })
    .join("");
}

export function generateTranscriptHtml(opts: {
  guildName: string;
  ticket: Ticket;
  messages: TranscriptMsg[];
  closedAt: number;
  closedByTag: string;
  closeReason: string;
}): string {
  const { guildName, ticket, messages, closedAt, closedByTag, closeReason } = opts;
  const created = new Date(ticket.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const closed = new Date(closedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const durationMs = Math.max(0, closedAt - ticket.created_at);
  const duration = formatDuration(durationMs);

  const header = `<table class="meta">
    <tr><td>Server</td><td>${esc(guildName)}</td></tr>
    <tr><td>Ticket</td><td>#${ticket.number}</td></tr>
    <tr><td>Type</td><td>${esc(ticket.type_name || "General Support")}</td></tr>
    <tr><td>User</td><td>${esc(`<@${ticket.creator_id}>`)}</td></tr>
    <tr><td>Staff</td><td>${ticket.claimed_by ? esc(`<@${ticket.claimed_by}>`) : "—"}</td></tr>
    <tr><td>Created</td><td>${esc(created)}</td></tr>
    <tr><td>Closed</td><td>${esc(closed)} (${duration})</td></tr>
    ${closeReason ? `<tr><td>Close reason</td><td>${esc(closeReason)}</td></tr>` : ""}
  </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket #${ticket.number} — ${esc(guildName)}</title>
<style>
  :root { --brand:#0057E7; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif; background:#0b0d13; color:#e7eaf0; }
  .wrap { max-width:820px; margin:0 auto; padding:32px 20px 64px; }
  header { display:flex; align-items:center; gap:14px; padding:20px 22px; background:#10141c; border:1px solid rgba(255,255,255,.07); border-radius:16px; margin-bottom:20px; }
  .logo { width:44px; height:44px; border-radius:12px; background:var(--brand); display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; }
  header h1 { margin:0; font-size:18px; }
  header p { margin:2px 0 0; color:#8b93a5; font-size:13px; }
  .card { background:#0f131b; border:1px solid rgba(255,255,255,.06); border-radius:16px; padding:20px 22px; margin-bottom:16px; }
  .meta { width:100%; border-collapse:collapse; font-size:14px; }
  .meta td { padding:7px 6px; border-bottom:1px solid rgba(255,255,255,.05); }
  .meta td:first-child { color:#8b93a5; width:130px; }
  h2 { font-size:14px; text-transform:uppercase; letter-spacing:.06em; color:#8b93a5; margin:0 0 6px; }
  .msg { display:flex; gap:14px; padding:10px 0; }
  .avatar { width:42px; height:42px; border-radius:50%; background:#232a37; flex-shrink:0; }
  .msg-meta { display:flex; gap:10px; align-items:baseline; }
  .author { font-weight:600; color:#fff; }
  .time { font-size:12px; color:#6b7285; }
  .content { margin-top:4px; white-space:pre-wrap; word-break:break-word; }
  .attachment { margin-top:6px; padding:8px 12px; background:#171c27; border:1px solid rgba(255,255,255,.07); border-radius:10px; font-size:14px; }
  .attachment a { color:#6ea1ff; text-decoration:none; }
  .msg-embed { margin-top:6px; padding:10px 14px; border-left:3px solid var(--brand); background:#171c27; border-radius:8px; }
  .msg-embed-title { font-weight:600; margin-bottom:2px; }
  .empty { color:#8b93a5; }
  footer { text-align:center; color:#5a6270; font-size:13px; margin-top:28px; }
  footer b { color:var(--brand); }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="logo">M</div>
      <div>
        <h1>Ticket #${ticket.number}</h1>
        <p>${esc(guildName)} • Transcript</p>
      </div>
    </header>
    <div class="card">${header}</div>
    <div class="card"><h2>Messages</h2>${renderMessages(messages)}</div>
    <footer>Generated by <b>Miko</b> • <span class="footer-close">closed by ${esc(closedByTag)}${closeReason ? ` — ${esc(closeReason)}` : ""}</span></footer>
  </div>
</body>
</html>`;
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}