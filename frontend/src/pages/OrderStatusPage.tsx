import { Link, useParams } from "react-router-dom";
import { getOrder } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { OrderStatusStepper } from "@/components/OrderStatusStepper";
import { DisruptionAlert } from "@/components/DisruptionAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Terminal states stop needing fresh data as urgently, but polling stays
// cheap and simple either way — 5s keeps the fan-facing screen feeling
// live without hammering the backend at hackathon scale.
const POLL_INTERVAL_MS = 5_000;

export function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, loading, error } = usePolling(() => getOrder(orderId!), POLL_INTERVAL_MS, [orderId]);

  if (!orderId) return null;

  if (loading && !order) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg p-4 text-center text-muted-foreground">
        Order not found. Check the link and try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order status</h1>
        <Link to={`/menu/${order.stand_id}`} className="text-sm text-muted-foreground underline">
          Back to menu
        </Link>
      </div>

      <DisruptionAlert order={order} />

      {order.status !== "disrupted" && (
        <Card>
          <CardContent className="pt-6">
            <OrderStatusStepper status={order.status} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items.map((item) => (
            <div key={item.item_id} className="flex items-center justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <div className="flex gap-1">
                {item.dietary_tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {order.eta_minutes !== undefined && (
            <p className="pt-2 text-sm text-muted-foreground">Estimated wait: ~{order.eta_minutes} min</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
