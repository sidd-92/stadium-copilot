import type { MenuItem, OrderItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";

export function CartSheet({
  items,
  menu,
  onSetQuantity,
  onPlaceOrder,
  placing,
}: {
  items: OrderItem[];
  menu: MenuItem[];
  onSetQuantity: (itemId: string, quantity: number) => void;
  onPlaceOrder: () => void;
  placing: boolean;
}) {
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const price = menu.find((m) => m.item_id === item.item_id)?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <Sheet>
      <SheetTrigger
        render={<Button className="fixed bottom-4 right-4 shadow-lg" disabled={totalCount === 0} />}
      >
        Cart {totalCount > 0 ? `(${totalCount})` : ""}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>Your order</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-4">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Your cart is empty.</p>}
          {items.map((item) => (
            <div key={item.item_id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                {item.name} × {item.quantity}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="icon" variant="outline" onClick={() => onSetQuantity(item.item_id, item.quantity - 1)}>
                  −
                </Button>
                <Button size="icon" variant="outline" onClick={() => onSetQuantity(item.item_id, item.quantity + 1)}>
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-2" />

        <SheetFooter>
          <div className="flex w-full items-center justify-between font-medium">
            <span>Total</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          <Button className="w-full" disabled={items.length === 0 || placing} onClick={onPlaceOrder}>
            {placing ? "Placing order…" : "Place order"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
