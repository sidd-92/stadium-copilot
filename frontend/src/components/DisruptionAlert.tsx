import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation, ShoppingBag, ArrowRight } from "lucide-react";
import type { Order, MenuResponse } from "@/lib/types";
import { getMenu } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";
import { T } from "@/lib/translations";
import { QueueBar } from "@/components/QueueBar";

export function DisruptionAlert({ order }: { order: Order }) {
  const { language } = useLanguage();
  const t = T[language];

  const [closedStand, setClosedStand] = useState<MenuResponse | null>(null);
  const [altStand, setAltStand] = useState<MenuResponse | null>(null);

  useEffect(() => {
    if (order.status !== "disrupted") return;
    getMenu(order.stand_id).then(setClosedStand).catch(() => setClosedStand(null));
    if (order.reassigned_to_stand_id) {
      getMenu(order.reassigned_to_stand_id).then(setAltStand).catch(() => setAltStand(null));
    }
  }, [order.status, order.stand_id, order.reassigned_to_stand_id]);

  if (order.status !== "disrupted") return null;

  const closedStandName = closedStand?.name ?? order.stand_id;
  const cartSummary = order.items.map((item) => item.name).join(" · ");
  const cartTotal = order.items.reduce(
    (sum, item) => sum + item.quantity * (closedStand?.menu.find((m) => m.item_id === item.item_id)?.price ?? 0),
    0,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[#F5C7A8]">
      {/* Non-alarming disruption notification — reroute icon, warm orange, not red */}
      <div className="flex items-start gap-3 border-b-2 border-[#F5C7A8] bg-[var(--sc-rust-light)] px-5 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--sc-rust)] text-white">
          <Navigation size={18} />
        </div>
        <div className="min-w-0">
          <div className="mb-0.5 text-[11px] font-bold tracking-wide text-[var(--sc-rust)]">
            {t.disruptionBadge.toUpperCase()}
          </div>
          <div className="truncate text-xs font-medium leading-relaxed text-[#92430C]">{closedStandName}</div>
        </div>
      </div>

      <div className="bg-[var(--sc-surface)] px-6 py-7">
        <div className="mb-7 text-center">
          <div className="mb-4 text-5xl">🛡️</div>
          <h2 className="mb-2.5 text-xl font-extrabold tracking-tight text-[var(--sc-ink)]">{t.disruptionTitle}</h2>
          <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-[var(--sc-graphite)]">
            {closedStandName} {order.resolution === "reassigned" ? t.disruptionReassigned : t.disruptionRefund}
            {order.resolution === "reassigned" && altStand ? ` ${altStand.name}.` : ""}
          </p>
        </div>

        {/* Cart saved indicator */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--sc-mint-light)] text-[var(--sc-mint)]">
            <ShoppingBag size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-[var(--sc-ink)]">{t.yourCart}</div>
            <div className="mt-px truncate text-[11px] text-[var(--sc-graphite)]">
              {cartSummary} · ${cartTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {order.resolution === "reassigned" && order.reassigned_to_stand_id && (
          <>
            <div className="mb-3 text-[11px] font-bold tracking-wide text-[var(--sc-ember)]">
              {t.nearbyStands.toUpperCase()}
            </div>
            <div className="mb-2.5 rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-card)] p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--sc-space)] text-[11px] font-extrabold text-white">
                  {order.reassigned_to_stand_id.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 truncate text-sm font-bold text-[var(--sc-ink)]">
                  {altStand?.name ?? order.reassigned_to_stand_id}
                </div>
              </div>
              {altStand && (
                <div className="mb-3">
                  <QueueBar queueLength={altStand.queue_length_estimate} />
                </div>
              )}
              <Link
                to={`/menu/${order.reassigned_to_stand_id}`}
                className="flex items-center justify-between rounded-[10px] bg-[var(--sc-space)] px-4 py-2.5 text-[13px] font-bold text-white"
              >
                <span>{t.viewMenu}</span>
                <ArrowRight size={14} className="opacity-60" />
              </Link>
            </div>
          </>
        )}

        <div className="mt-4 rounded-xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-4 py-3 text-center text-[11px] font-medium text-[var(--sc-mist)]">
          {t.noCharge}
        </div>
      </div>
    </div>
  );
}
