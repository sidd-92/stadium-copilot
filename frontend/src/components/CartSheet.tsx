import type { MenuItem, OrderItem } from "@/lib/types";
import { useLanguage } from "@/lib/language";
import { T } from "@/lib/translations";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  const { language } = useLanguage();
  const t = T[language];
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const price = menu.find((m) => m.item_id === item.item_id)?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            disabled={totalCount === 0}
            className="fixed bottom-5 left-1/2 z-20 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-[var(--sc-ember)] px-5 py-3.5 font-bold text-white shadow-[0_8px_24px_rgba(232,50,26,0.4)] disabled:opacity-0"
          />
        }
      >
        <span className="flex items-center justify-between">
          <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[13px]">{totalCount}</span>
          <span>{t.viewCart}</span>
          <span>${totalPrice.toFixed(2)}</span>
        </span>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[85vh] bg-[var(--sc-surface)]">
        <SheetHeader>
          <SheetTitle className="text-[var(--sc-ink)]">{t.yourCart}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 overflow-y-auto px-4">
          {items.length === 0 && <p className="text-sm text-[var(--sc-mist)]">{t.cartEmpty}</p>}
          {items.map((item) => {
            const price = menu.find((m) => m.item_id === item.item_id)?.price ?? 0;
            return (
              <div
                key={item.item_id}
                className="flex items-center gap-3 rounded-xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[var(--sc-ink)]">{item.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--sc-graphite)]">
                    ×{item.quantity} · ${(price * item.quantity).toFixed(2)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onSetQuantity(item.item_id, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--sc-surface-2)] text-[var(--sc-graphite)]"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => onSetQuantity(item.item_id, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--sc-surface-2)] text-[var(--sc-graphite)]"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="mx-4 mt-3 rounded-xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-4 py-3.5">
            <div className="flex justify-between text-[13px] font-medium text-[var(--sc-graphite)]">
              <span>{t.subtotal}</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <div className="my-2.5 h-px bg-[var(--sc-border)]" />
            <div className="flex justify-between text-[15px] font-extrabold text-[var(--sc-ink)]">
              <span>{t.total}</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="p-4 pb-6">
          <button
            disabled={items.length === 0 || placing}
            onClick={onPlaceOrder}
            className="flex w-full items-center justify-between rounded-2xl bg-[var(--sc-ember)] px-5 py-3.5 font-bold text-white shadow-[0_8px_24px_rgba(232,50,26,0.4)] disabled:opacity-40"
          >
            <span>{placing ? "…" : t.placeOrder}</span>
            <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-sm">${totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
