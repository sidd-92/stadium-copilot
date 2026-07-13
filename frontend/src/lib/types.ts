// Mirrors backend/src/order-service/types.ts and the MatchEvent shape
// published by ingestion-service — kept in sync by hand since frontend
// and backend are separate npm packages in this monorepo.

export type OrderStatus = "placed" | "confirmed" | "preparing" | "ready_for_pickup" | "collected" | "disrupted";

export type DisruptionResolution = "reassigned" | "refund_pending" | null;

export interface OrderItem {
  item_id: string;
  name: string;
  quantity: number;
  dietary_tags: string[];
}

export interface Order {
  order_id: string;
  match_id: string;
  stand_id: string;
  items: OrderItem[];
  status: OrderStatus;
  disruption_reason: "stand_closed_incident" | null;
  resolution: DisruptionResolution;
  reassigned_to_stand_id: string | null;
  created_at: string;
  updated_at: string;
  eta_minutes?: number;
}

export interface MenuItem {
  item_id: string;
  name: string;
  dietary_tags: string[];
  price: number;
  in_stock: boolean;
}

export interface MenuResponse {
  stand_id: string;
  name: string;
  match_id: string;
  status: "open" | "closed_incident";
  queue_length_estimate: number;
  menu: MenuItem[];
  summary: string;
}

export interface MatchEvent {
  match_id: string;
  // Absent for not-yet-determined fixtures (e.g. a final/3rd-place match
  // before the semifinals resolve who's playing in it).
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_score: string;
  away_score: string;
  finished: string;
  time_elapsed: string;
  group: string;
  type: string;
  local_date: string;
  stadium_id: string;
  last_updated: string;
}

export type SupportedLanguage = "en" | "fr" | "pt";
