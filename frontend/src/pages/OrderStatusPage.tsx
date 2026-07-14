import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getOrder } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { useLanguage } from "@/lib/language";
import { T } from "@/lib/translations";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import { DisruptionAlert } from "@/components/DisruptionAlert";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderStatus } from "@/lib/types";

// Terminal states stop needing fresh data as urgently, but polling stays
// cheap and simple either way — 5s keeps the fan-facing screen feeling
// live without hammering the backend at hackathon scale.
const POLL_INTERVAL_MS = 5_000;

const STEP_LABEL_KEY: Record<OrderStatus, string> = {
  placed: "orderPlaced",
  confirmed: "orderConfirmed",
  preparing: "orderPreparing",
  ready_for_pickup: "orderReady",
  collected: "orderCollected",
  disrupted: "",
};

const HERO_EMOJI: Record<OrderStatus, string> = {
  placed: "📋",
  confirmed: "✅",
  preparing: "👨‍🍳",
  ready_for_pickup: "🎉",
  collected: "✅",
  disrupted: "",
};

export function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { language } = useLanguage();
  const t = T[language];
  const { data: order, loading, error } = usePolling(() => getOrder(orderId!), POLL_INTERVAL_MS, [orderId]);

  if (!orderId) return null;

  if (loading && !order) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return <div className="mx-auto max-w-lg p-4 text-center text-[var(--sc-mist)]">{t.orderNotFound}</div>;
  }

  const isDisrupted = order.status === "disrupted";
  const isDone = order.status === "ready_for_pickup" || order.status === "collected";

  return (
    <div className="min-h-screen bg-[var(--sc-surface)] pb-8">
      <div className="flex items-center gap-3 border-b border-[var(--sc-border)] bg-[var(--sc-card)] px-5 py-3.5">
        <Link to={`/menu/${order.stand_id}`} className="flex items-center gap-1 text-[13px] font-semibold text-[var(--sc-graphite)]">
          <ArrowLeft size={16} />
          {t.backToMenu}
        </Link>
        <div className="flex-1 text-center text-sm font-extrabold tracking-tight text-[var(--sc-ink)]">
          #{order.order_id.slice(0, 8).toUpperCase()}
        </div>
        <div className="w-14" />
      </div>

      {isDisrupted ? (
        <div className="p-4">
          <DisruptionAlert order={order} />
        </div>
      ) : (
        <>
          {/* Status hero */}
          <div
            className="relative overflow-hidden px-5 py-8 text-center"
            style={{ background: isDone ? "var(--sc-mint)" : "var(--sc-space)" }}
          >
            <div className="mb-3 text-5xl">{HERO_EMOJI[order.status]}</div>
            <div className="mb-2 text-xl font-extrabold tracking-tight text-white">
              {t[STEP_LABEL_KEY[order.status]]}
            </div>
            {order.eta_minutes !== undefined && !isDone && (
              <div className="text-xs text-white/50">
                {t.estimatedTime} <span className="font-bold text-[var(--sc-gold)]">~{order.eta_minutes} {t.minutes}</span>
              </div>
            )}
          </div>

          <div className="px-6 pt-6">
            <OrderStatusStepper status={order.status} />
          </div>
        </>
      )}

      <div className="mx-4 mt-5 rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-4 py-3.5">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-[var(--sc-ember)]">
          {t.orderSummary.toUpperCase()}
        </div>
        <div className="space-y-1.5">
          {order.items.map((item) => (
            <div key={item.item_id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="min-w-0 truncate text-[var(--sc-ink)]">
                {item.name} × {item.quantity}
              </span>
              <div className="flex shrink-0 gap-1">
                {item.dietary_tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-[var(--sc-mint-light)] px-1.5 py-0.5 text-[10px] font-semibold text-[#00916A]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
