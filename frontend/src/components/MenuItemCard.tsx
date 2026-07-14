import type { MenuItem, OrderItem } from "@/lib/types";
import { useLanguage } from "@/lib/language";
import { T } from "@/lib/translations";

// No item images/colors come from the backend, so derive a stable color
// per item_id — same visual language as the design's color-coded swatch,
// just computed instead of hand-picked.
const SWATCH_COLORS = ["#C2742A", "#4A7C4E", "#B36B2B", "#5E3A8A", "#B85C38", "#2A6B8C", "#8C4A6B"];

function swatchColor(itemId: string): string {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) hash = (hash * 31 + itemId.charCodeAt(i)) >>> 0;
  return SWATCH_COLORS[hash % SWATCH_COLORS.length];
}

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
  const { language } = useLanguage();
  const t = T[language];
  const quantity = cartItem?.quantity ?? 0;

  return (
    <div
      className={`flex min-h-[88px] overflow-hidden rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-card)] ${item.in_stock ? "" : "opacity-50"}`}
    >
      <div className="relative w-[72px] shrink-0" style={{ background: swatchColor(item.item_id), opacity: 0.85 }}>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15), transparent)" }}
        />
      </div>

      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate text-sm font-bold leading-tight tracking-tight text-[var(--sc-ink)]">
              {item.name}
            </p>
            {!item.in_stock && (
              <span className="shrink-0 rounded bg-[var(--sc-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--sc-mist)]">
                {t.outOfStock}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
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

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[15px] font-bold text-[var(--sc-ink)]">${item.price.toFixed(2)}</span>

          {item.in_stock &&
            (quantity === 0 ? (
              <button
                onClick={() => onAdd(item)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sc-ember)] text-lg font-bold leading-none text-white"
              >
                +
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSetQuantity(item.item_id, quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sc-border)] text-[var(--sc-graphite)]"
                >
                  −
                </button>
                <span className="w-4 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                <button
                  onClick={() => onSetQuantity(item.item_id, quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sc-ember)] text-white"
                >
                  +
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
