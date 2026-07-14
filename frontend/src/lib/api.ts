import type { MatchEvent, MenuResponse, Order, OrderItem, OrderStatus, SupportedLanguage } from "./types";

// order-service is the only public backend surface — ingestion-service is
// INTERNAL_ONLY and never reachable from the browser.
const BASE_URL = import.meta.env.VITE_ORDER_SERVICE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export function getMenu(
  standId: string,
  options: { dietary?: string[]; language?: SupportedLanguage } = {},
): Promise<MenuResponse> {
  const params = new URLSearchParams();
  if (options.dietary && options.dietary.length > 0) params.set("dietary", options.dietary.join(","));
  if (options.language) params.set("language", options.language);
  const query = params.toString();
  return request<MenuResponse>(`/menu/${encodeURIComponent(standId)}${query ? `?${query}` : ""}`);
}

export function placeOrder(standId: string, items: OrderItem[]): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify({ stand_id: standId, items }),
  });
}

export function getOrder(orderId: string): Promise<Order> {
  return request<Order>(`/orders/${encodeURIComponent(orderId)}`);
}

// Backed by ingestion-service's Redis cache (match:{id}, 60s TTL) via a
// read-only route in backend/src/order-service/app.ts. Returns null on
// 404 (no live data cached right now) rather than throwing, since "no
// live match" is an expected, common state, not an error.
export async function getMatch(matchId: string): Promise<MatchEvent | null> {
  try {
    return await request<MatchEvent>(`/matches/${encodeURIComponent(matchId)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Backed by ingestion-service's full-schedule snapshot (matches:all,
// refreshed every poll cycle regardless of match status).
export async function getUpcomingMatches(limit = 5): Promise<MatchEvent[]> {
  const { matches } = await request<{ matches: MatchEvent[] }>(`/matches/upcoming?limit=${limit}`);
  return matches;
}

// Stand-staff actions — no real kitchen/POS system exists, so this is
// what actually moves an order through the fulfillment lifecycle.
export async function getStandOrders(standId: string): Promise<Order[]> {
  const { orders } = await request<{ orders: Order[] }>(`/stands/${encodeURIComponent(standId)}/orders`);
  return orders;
}

export function advanceOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  return request<Order>(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
