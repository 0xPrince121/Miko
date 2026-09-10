/**
 * Offline smoke test for the shared DB layer + transcript generator.
 * Run: node scripts/smoke.js
 * Uses only the compiled packages/db and bot dist outputs.
 */
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "miko-test-"));
process.env.MIKO_ROOT = tmp;
process.env.DATABASE_URL = "file:data.db";
process.env.MIKO_ENV_TEST = "1";

const db = require("../packages/db/dist/index.js");
const { generateTranscriptHtml } = require("../bot/dist/transcript.js");

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

// 1) guild config
let cfg = db.getGuildConfig("guild-1");
assert(cfg.panel_title === "Need Help? \u{1F499}", "default guild config has default panel title");
assert(cfg.ticket_limit === 0, "default ticket limit is 0 (unlimited)");

cfg = db.saveGuildConfig("guild-1", { support_role: "role-staff", panel_title: "How can we help?" });
assert(cfg.support_role === "role-staff", "guild config persisted support role");
assert(cfg.panel_title === "How can we help?", "guild config persisted panel title");
assert(cfg.close_action === "move", "close action defaults to move");

// 2) ticket types
const t1 = db.addTicketType("guild-1", { name: "General Support", emoji: "\u{1F3AB}", description: "General help", category_id: "cat-main", support_role: "" });
const t2 = db.addTicketType("guild-1", { name: "Billing", emoji: "\u{1F4B3}", description: "Payments", category_id: "", support_role: "role-billing" });
const types = db.listTicketTypes("guild-1");
assert(types.length === 2, "created two ticket types");
assert(types[0].sort === 1 && types[1].sort === 2, "types are sorted by insertion");
assert(t2.support_role === "role-billing", "type-level support role stored");
db.deleteTicketType(t1.id);
assert(db.listTicketTypes("guild-1").length === 1, "ticket type deletion works");
db.addTicketType("guild-1", { name: "Partnership", emoji: "\u{1F91D}", description: "", category_id: "", support_role: "" });

// 3) tickets
const ticket = db.createTicket({
  guildId: "guild-1",
  number: db.getNextTicketNumber("guild-1"),
  channelId: "chan-101",
  typeName: "General Support",
  creatorId: "user-1",
});
assert(ticket.number === 1, "first ticket gets number 1");
assert(ticket.status === "open", "ticket starts open");
assert(db.countOpenTicketsByUser("guild-1", "user-1") === 1, "open ticket counted per user");

const t2_ = db.createTicket({
  guildId: "guild-1",
  number: db.getNextTicketNumber("guild-1"),
  channelId: "chan-102",
  typeName: "Billing",
  creatorId: "user-1",
});
assert(t2_.number === 2, "second ticket gets number 2");

db.addTicketUser(ticket.id, "user-2");
assert(db.listTicketUsers(ticket.id).includes("user-2"), "added user appears in ticket users");

db.updateTicket(ticket.id, { claimed_by: "user-staff-9", status: "closed", closed_at: Date.now(), close_reason: "Resolved" });
let st = db.getTicket(ticket.id);
assert(st.claimed_by === "user-staff-9" && st.status === "closed" && st.close_reason === "Resolved", "ticket update works");

// 4) stats
const stats = db.getTicketStats("guild-1");
assert(stats.total === 2 && stats.open === 1 && stats.closed === 1, "stats reflect open/closed");
assert(db.getTicketByChannel("chan-101").id === ticket.id, "lookup by channel id");

// 5) transcript generator (pure, no discord.js needed)
const html = generateTranscriptHtml({
  guildName: "Miko Test Server",
  ticket: st,
  messages: [
    {
      author: { id: "user-1", tag: "sam", avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" },
      content: "Hello! I need help with billing <3",
      timestamp: Date.now() - 60000,
      attachments: [],
      embeds: [],
    },
    {
      author: { id: "user-staff-9", tag: "staff", avatarUrl: "" },
      content: "Hi, we've sorted it out.",
      timestamp: Date.now() - 30000,
      attachments: [{ name: "receipt.png", url: "https://example.com/r.png" }],
      embeds: [{ title: "", description: "" }],
    },
  ],
  closedAt: Date.now(),
  closedByTag: "staff",
  closeReason: "Resolved",
});
assert(html.includes("Ticket #1"), "transcript contains ticket number");
assert(html.includes("Miko Test Server"), "transcript contains server name");
assert(html.includes("recover") || html.includes("billing"), "transcript contains message content");
assert(html.includes("receipt.png"), "transcript contains attachment name");
assert(html.includes("<tr><td>Close reason</td><td>Resolved</td></tr>"), "transcript contains close reason");
assert(html.includes("#0057E7") || html.includes("--brand"), "transcript uses Miko brand color");

console.log("\nAll smoke tests passed ✓");
fs.rmSync(tmp, { recursive: true, force: true });