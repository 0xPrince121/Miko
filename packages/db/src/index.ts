export { loadEnv, required, optional } from "./env";
export { repoRoot } from "./path";
export { getDb, closeDb } from "./db";
export {
  defaultConfig,
  getGuildConfig,
  saveGuildConfig,
} from "./guilds";
export type { GuildConfig } from "./types";
export {
  listTicketTypes,
  addTicketType,
  updateTicketType,
  deleteTicketType,
  getTicketType,
  ensureDefaultType,
} from "./ticket-types";
export type { TicketType, Ticket, TicketStatus, TicketStats } from "./types";
export {
  getNextTicketNumber,
  createTicket,
  getTicket,
  getTicketByChannel,
  listTickets,
  countOpenTicketsByUser,
  updateTicket,
  getTicketStats,
  recentTickets,
  openTicketsOlderThan,
  allOpenTickets,
  addTicketUser,
  removeTicketUser,
  listTicketUsers,
  userHasTicketAccess,
} from "./tickets";