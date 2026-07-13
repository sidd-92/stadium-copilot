import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getMenu, placeOrder } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { useCart } from "@/hooks/useCart";
import { MatchBanner } from "@/components/MatchBanner";
import { UpcomingMatches } from "@/components/UpcomingMatches";
import { DietaryFilterBar } from "@/components/DietaryFilterBar";
import { MenuItemCard } from "@/components/MenuItemCard";
import { CartSheet } from "@/components/CartSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function MenuPage() {
  const { standId } = useParams<{ standId: string }>();
  const navigate = useNavigate();
  const [dietary, setDietary] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const cart = useCart(standId ?? "unknown-stand");

  const { data: menuResponse, loading, error } = usePolling(
    () => getMenu(standId!, { dietary }),
    30_000,
    [standId, dietary.join(",")],
  );

  function toggleDietary(tag: string) {
    setDietary((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handlePlaceOrder() {
    if (!standId) return;
    setPlacing(true);
    try {
      const order = await placeOrder(standId, cart.items);
      cart.clear();
      toast.success("Order placed!");
      navigate(`/orders/${order.order_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (!standId) return null;

  if (loading && !menuResponse) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !menuResponse) {
    return (
      <div className="mx-auto max-w-lg p-4 text-center text-muted-foreground">
        Stand not found. Double check the QR code or stand ID.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <MatchBanner matchId={menuResponse.match_id} />
      <UpcomingMatches />

      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{menuResponse.name}</h1>
          <Badge variant={menuResponse.status === "open" ? "default" : "destructive"}>
            {menuResponse.status === "open" ? "Open" : "Closed"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{menuResponse.summary}</p>
      </div>

      <DietaryFilterBar selected={dietary} onToggle={toggleDietary} />

      <div className="space-y-3">
        {menuResponse.menu.length === 0 && (
          <p className="text-sm text-muted-foreground">No items match your dietary filter.</p>
        )}
        {menuResponse.menu.map((item) => (
          <MenuItemCard
            key={item.item_id}
            item={item}
            cartItem={cart.items.find((i) => i.item_id === item.item_id)}
            onAdd={cart.addItem}
            onSetQuantity={cart.setQuantity}
          />
        ))}
      </div>

      <CartSheet
        items={cart.items}
        menu={menuResponse.menu}
        onSetQuantity={cart.setQuantity}
        onPlaceOrder={handlePlaceOrder}
        placing={placing}
      />
    </div>
  );
}
