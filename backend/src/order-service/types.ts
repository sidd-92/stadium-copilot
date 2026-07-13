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
}

export interface MenuItem {
  item_id: string;
  name: string;
  dietary_tags: string[];
  price: number;
  in_stock: boolean;
}

export interface Stand {
  stand_id: string;
  name: string;
  match_id: string;
  menu: MenuItem[];
  status: "open" | "closed_incident";
  queue_length_estimate: number;
}

// Standard Pub/Sub push subscription envelope. No producer for
// stand-status exists yet in this codebase — this is the assumed
// contract: JSON body (base64-decoded) carrying stand_id/event_type,
// with the same fields optionally duplicated as message attributes
// (mirroring the match_id/status attribute convention used on
// match-events by ingestion-service).
export interface PubSubPushEnvelope {
  message?: {
    data?: string;
    attributes?: Record<string, string>;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
}

export interface StandStatusEventPayload {
  stand_id?: string;
  event_type?: string;
  language?: string;
}
