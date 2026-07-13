import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" },
  { status: "ready_for_pickup", label: "Ready" },
  { status: "collected", label: "Collected" },
];

export function OrderStatusStepper({ status }: { status: OrderStatus }) {
  if (status === "disrupted") {
    return null; // disruption gets its own alert (DisruptionAlert), not a step position
  }

  const currentIndex = STEPS.findIndex((step) => step.status === status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <div key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary",
                  !isDone && !isCurrent && "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {isDone ? "✓" : index + 1}
              </div>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn("mx-1 h-0.5 flex-1", isDone ? "bg-primary" : "bg-muted-foreground/30")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
