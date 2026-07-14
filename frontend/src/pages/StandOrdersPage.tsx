import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { advanceOrderStatus, getStandOrders } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { useLanguage } from "@/lib/language";
import { T } from "@/lib/translations";
import type { Order, OrderStatus } from "@/lib/types";

// No real kitchen/POS system exists for this hackathon — this screen
// (meant for a stand employee, not a fan) is what actually drives orders
// through placed -> confirmed -> preparing -> ready_for_pickup ->
// collected. Without it, every order would sit at "placed" forever.
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "confirmed",
  confirmed: "preparing",
  preparing: "ready_for_pickup",
  ready_for_pickup: "collected",
};

const STEP_LABEL_KEY: Record<OrderStatus, string> = {
  placed: "orderPlaced",
  confirmed: "orderConfirmed",
  preparing: "orderPreparing",
  ready_for_pickup: "orderReady",
  collected: "orderCollected",
  disrupted: "",
};

const POLL_INTERVAL_MS = 5_000;

export function StandOrdersPage() {
  const { standId } = useParams<{ standId: string }>();
  const { language } = useLanguage();
  const t = T[language];
  const [advancing, setAdvancing] = useState<string | null>(null);

  const { data: orders, loading } = usePolling(() => getStandOrders(standId!), POLL_INTERVAL_MS, [standId]);

  async function handleAdvance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setAdvancing(order.order_id);
    try {
      await advanceOrderStatus(order.order_id, next);
      toast.success(`Order moved to ${t[STEP_LABEL_KEY[next]]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setAdvancing(null);
    }
  }

  if (!standId) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-[var(--sc-ink)]">Stand {standId} — Orders</h1>
        <p className="mt-1 text-[13px] text-[var(--sc-graphite)]">
          Staff view. Tap an order to move it to the next stage.
        </p>
      </div>

      {loading && !orders && <p className="text-sm text-[var(--sc-mist)]">Loading…</p>}

      {orders && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--sc-border)] bg-[var(--sc-card)] py-8 text-center text-sm text-[var(--sc-mist)]">
          No active orders.
        </div>
      )}

      <div className="space-y-2.5">
        {orders?.map((order) => {
          const next = NEXT_STATUS[order.status];
          return (
            <div key={order.order_id} className="rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[var(--sc-ink)]">
                    #{order.order_id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--sc-graphite)]">
                    {order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-[var(--sc-warn-light)] px-2 py-1 text-[10px] font-bold tracking-wide text-[var(--sc-warn)]">
                  {t[STEP_LABEL_KEY[order.status]]?.toUpperCase()}
                </span>
              </div>

              {next && (
                <button
                  onClick={() => handleAdvance(order)}
                  disabled={advancing === order.order_id}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--sc-space)] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {advancing === order.order_id ? "…" : `Move to ${t[STEP_LABEL_KEY[next]]}`}
                  {advancing !== order.order_id && <ArrowRight size={14} className="opacity-60" />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
