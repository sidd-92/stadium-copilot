import type { Order } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function DisruptionAlert({ order }: { order: Order }) {
  if (order.status !== "disrupted") return null;

  if (order.resolution === "reassigned" && order.reassigned_to_stand_id) {
    return (
      <Alert>
        <AlertTitle>Your order was moved</AlertTitle>
        <AlertDescription>
          The stand you ordered from closed due to an incident. Your order has been reassigned to stand{" "}
          <strong>{order.reassigned_to_stand_id}</strong>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Your order was disrupted</AlertTitle>
      <AlertDescription>
        The stand you ordered from closed due to an incident and no suitable alternate stand was found. A refund is
        being processed.
      </AlertDescription>
    </Alert>
  );
}
