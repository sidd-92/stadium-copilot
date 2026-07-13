import { Firestore } from "@google-cloud/firestore";
import type { Order, OrderItem, OrderStatus, Stand } from "./types";

let firestore: Firestore | null = null;

function getFirestore(): Firestore {
  if (!firestore) {
    firestore = new Firestore();
  }
  return firestore;
}

const ORDERS_COLLECTION = "orders";
const STANDS_COLLECTION = "stands";

// Forward path through the lifecycle, plus the disruption branch reachable
// from any state before collection (per the state diagram). collected and
// disrupted are terminal — e.g. collected can never go back to placed.
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "disrupted"],
  confirmed: ["preparing", "disrupted"],
  preparing: ["ready_for_pickup", "disrupted"],
  ready_for_pickup: ["collected", "disrupted"],
  collected: [],
  disrupted: [],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function estimateEtaMinutes(queueLength: number, items: OrderItem[]): number {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const queueMinutes = queueLength * 1.5; // ~1.5 min per person ahead in queue
  const prepMinutes = itemCount * 1; // ~1 min per item to prepare
  return Math.max(2, Math.round(queueMinutes + prepMinutes));
}

export async function createOrder(params: { match_id: string; stand_id: string; items: OrderItem[] }): Promise<Order> {
  const db = getFirestore();
  const ref = db.collection(ORDERS_COLLECTION).doc();
  const now = new Date().toISOString();

  const order: Order = {
    order_id: ref.id,
    match_id: params.match_id,
    stand_id: params.stand_id,
    items: params.items,
    status: "placed",
    disruption_reason: null,
    resolution: null,
    reassigned_to_stand_id: null,
    created_at: now,
    updated_at: now,
  };

  await ref.set(order);
  return order;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const db = getFirestore();
  const snap = await db.collection(ORDERS_COLLECTION).doc(orderId).get();
  return snap.exists ? (snap.data() as Order) : null;
}

export async function getOrdersByStandAndStatuses(standId: string, statuses: OrderStatus[]): Promise<Order[]> {
  const db = getFirestore();
  const snap = await db
    .collection(ORDERS_COLLECTION)
    .where("stand_id", "==", standId)
    .where("status", "in", statuses)
    .get();
  return snap.docs.map((doc) => doc.data() as Order);
}

export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  extra: Partial<Pick<Order, "disruption_reason" | "resolution" | "reassigned_to_stand_id">> = {},
): Promise<Order> {
  const db = getFirestore();
  const ref = db.collection(ORDERS_COLLECTION).doc(orderId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error(`Order ${orderId} not found`);
  }

  const current = snap.data() as Order;
  if (!isValidTransition(current.status, to)) {
    throw new Error(`Invalid order transition: ${current.status} -> ${to}`);
  }

  const updated: Order = {
    ...current,
    ...extra,
    status: to,
    updated_at: new Date().toISOString(),
  };

  await ref.set(updated);
  return updated;
}

export async function getStand(standId: string): Promise<Stand | null> {
  const db = getFirestore();
  const snap = await db.collection(STANDS_COLLECTION).doc(standId).get();
  return snap.exists ? (snap.data() as Stand) : null;
}

export async function getStandsByMatch(matchId: string): Promise<Stand[]> {
  const db = getFirestore();
  const snap = await db.collection(STANDS_COLLECTION).where("match_id", "==", matchId).get();
  return snap.docs.map((doc) => doc.data() as Stand);
}
