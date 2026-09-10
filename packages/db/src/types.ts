export interface GuildConfig {
  guild_id: string;
  ticket_category: string;
  closed_category: string;
  support_role: string;
  log_channel: string;
  transcript_channel: string;
  panel_channel: string;
  require_staff_role: number;
  panel_title: string;
  panel_description: string;
  panel_emoji: string;
  button_name: string;
  button_emoji: string;
  ticket_limit: number;
  auto_close_days: number;
  transcript_dm: number;
  close_action: "move" | "delete";
  panel_message_id: string;
  updated_at: number;
}

export interface TicketType {
  id: number;
  guild_id: string;
  name: string;
  emoji: string;
  description: string;
  category_id: string;
  support_role: string;
  sort: number;
}

export type TicketStatus = "open" | "closed" | "deleted";

export interface Ticket {
  id: number;
  number: number;
  guild_id: string;
  channel_id: string;
  type_name: string;
  creator_id: string;
  claimed_by: string | null;
  control_message_id: string;
  status: TicketStatus;
  created_at: number;
  closed_at: number | null;
  close_reason: string | null;
}

export interface TicketStats {
  open: number;
  closed: number;
  deleted: number;
  total: number;
  inProgress: number;
}