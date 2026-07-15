import { CheckCircle2, Circle, Loader2, Package } from "lucide-react";
import type { OrderStatus } from "@/lib/types";
import { useLanguage } from "@/hooks/useLanguage";
import { T } from "@/lib/translations";

const STEPS: OrderStatus[] = ["placed", "confirmed", "preparing", "ready_for_pickup", "collected"];

const STEP_LABEL_KEY: Record<OrderStatus, string> = {
  placed: "orderPlaced",
  confirmed: "orderConfirmed",
  preparing: "orderPreparing",
  ready_for_pickup: "orderReady",
  collected: "orderCollected",
  disrupted: "",
};

export function OrderStatusStepper({ status }: { status: OrderStatus }) {
  const { language } = useLanguage();
  const t = T[language];

  if (status === "disrupted") {
    return null; // disruption gets its own alert (DisruptionAlert), not a step position
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <div>
      <div className="mb-4 text-[11px] font-bold tracking-wide text-[var(--sc-ember)]">{t.orderProgress}</div>
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isPending = i > currentIndex;
        const isPreparingNow = isCurrent && step === "preparing";

        return (
          <div key={step} className="flex gap-3.5">
            <div className="flex shrink-0 flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isDone
                    ? "bg-[var(--sc-mint-light)] text-[var(--sc-mint)]"
                    : isCurrent
                      ? "bg-[var(--sc-warn-light)] text-[var(--sc-warn)]"
                      : "bg-[var(--sc-surface-2)] text-[var(--sc-border)]"
                }`}
              >
                {/* Precedence: done (check) > actively preparing (spinner) >
                    current-but-not-preparing (package for "placed", check
                    for the rest) > not-yet-reached (empty circle). */}
                {isDone ? (
                  <CheckCircle2 size={20} />
                ) : isPreparingNow ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isCurrent ? (
                  step === "placed" ? (
                    <Package size={20} />
                  ) : (
                    <CheckCircle2 size={20} />
                  )
                ) : (
                  <Circle size={20} />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="my-1 w-0.5 flex-1 rounded"
                  style={{ minHeight: 32, background: isDone ? "var(--sc-mint)" : "var(--sc-border)" }}
                />
              )}
            </div>

            <div className={i < STEPS.length - 1 ? "pt-2.5 pb-4" : "pt-2.5"}>
              <div
                className={`text-sm ${isCurrent ? "font-bold" : "font-medium"} ${
                  isPending ? "text-[var(--sc-border)]" : isDone ? "text-[var(--sc-graphite)]" : "text-[var(--sc-ink)]"
                }`}
              >
                {t[STEP_LABEL_KEY[step]]}
              </div>
              {isDone && <div className="mt-0.5 text-[11px] font-medium text-[var(--sc-mist)]">✓</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
