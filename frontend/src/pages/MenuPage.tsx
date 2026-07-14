import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getMenu, placeOrder } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/lib/language";
import { T } from "@/lib/translations";
import { MatchBanner } from "@/components/MatchBanner";
import { UpcomingMatches } from "@/components/UpcomingMatches";
import { DietaryFilterBar } from "@/components/DietaryFilterBar";
import { MenuItemCard } from "@/components/MenuItemCard";
import { CartSheet } from "@/components/CartSheet";
import { QueueBar } from "@/components/QueueBar";
import { Skeleton } from "@/components/ui/skeleton";

export function MenuPage() {
  const { standId } = useParams<{ standId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = T[language];
  const [dietary, setDietary] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const cart = useCart(standId ?? "unknown-stand");

  const { data: menuResponse, loading, error } = usePolling(
    () => getMenu(standId!, { dietary, language }),
    30_000,
    [standId, dietary.join(","), language],
  );

  function toggleDietary(tag: string) {
    setDietary((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
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
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !menuResponse) {
    return <div className="mx-auto max-w-lg p-4 text-center text-[var(--sc-mist)]">{t.standNotFound}</div>;
  }

  const initials = menuResponse.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-lg space-y-4 bg-[var(--sc-surface)] p-4 pb-28">
      <MatchBanner matchId={menuResponse.match_id} />
      <UpcomingMatches />

      {/* Stand header */}
      <div className="rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold leading-tight tracking-tight text-[var(--sc-ink)]">
              {menuResponse.name}
            </h1>
            <span
              className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${
                menuResponse.status === "open"
                  ? "bg-[var(--sc-mint-light)] text-[#00916A]"
                  : "bg-[var(--sc-rust-light)] text-[var(--sc-rust)]"
              }`}
            >
              {menuResponse.status === "open" ? t.open : t.closed}
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--sc-space)] text-lg font-extrabold tracking-tight text-white">
            {initials}
          </div>
        </div>
        <p className="mt-2 text-[13px] text-[var(--sc-graphite)]">{menuResponse.summary}</p>
        <div className="mt-3.5">
          <QueueBar queueLength={menuResponse.queue_length_estimate} />
        </div>
      </div>

      <DietaryFilterBar selected={dietary} onToggle={toggleDietary} />

      <div className="space-y-2.5">
        {menuResponse.menu.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--sc-mist)]">No items match this filter</p>
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

      <div className="pt-2 text-center">
        <Link to={`/stand/${standId}/orders`} className="text-xs text-[var(--sc-mist)] underline">
          Stand staff view
        </Link>
      </div>
    </div>
  );
}
