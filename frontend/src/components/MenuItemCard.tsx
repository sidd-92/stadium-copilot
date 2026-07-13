import type { MenuItem, OrderItem } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function MenuItemCard({
  item,
  cartItem,
  onAdd,
  onSetQuantity,
}: {
  item: MenuItem;
  cartItem: OrderItem | undefined;
  onAdd: (item: MenuItem) => void;
  onSetQuantity: (itemId: string, quantity: number) => void;
}) {
  const quantity = cartItem?.quantity ?? 0;

  return (
    <Card className={item.in_stock ? "" : "opacity-50"}>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{item.name}</p>
            {!item.in_stock && (
              <Badge variant="outline" className="shrink-0">
                Out of stock
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {item.dietary_tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
        </div>

        {item.in_stock &&
          (quantity === 0 ? (
            <Button size="sm" onClick={() => onAdd(item)}>
              Add
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => onSetQuantity(item.item_id, quantity - 1)}>
                −
              </Button>
              <span className="w-4 text-center tabular-nums">{quantity}</span>
              <Button size="icon" variant="outline" onClick={() => onSetQuantity(item.item_id, quantity + 1)}>
                +
              </Button>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
