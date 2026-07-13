import { useCallback, useEffect, useState } from "react";
import type { MenuItem, OrderItem } from "@/lib/types";

// Cart is scoped per stand_id (an order can only go to one stand) and
// persisted to localStorage so a fan re-scanning the QR mid-decision
// doesn't lose their cart.
function storageKey(standId: string): string {
  return `stadium-copilot:cart:${standId}`;
}

export function useCart(standId: string) {
  const [items, setItems] = useState<OrderItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey(standId));
      return raw ? (JSON.parse(raw) as OrderItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey(standId), JSON.stringify(items));
  }, [standId, items]);

  const addItem = useCallback((menuItem: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.item_id === menuItem.item_id);
      if (existing) {
        return prev.map((item) =>
          item.item_id === menuItem.item_id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        { item_id: menuItem.item_id, name: menuItem.name, quantity: 1, dietary_tags: menuItem.dietary_tags },
      ];
    });
  }, []);

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.item_id !== itemId);
      return prev.map((item) => (item.item_id === itemId ? { ...item, quantity } : item));
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, addItem, setQuantity, clear, totalCount };
}
