"use client";

// Phase 3a — 訪客購物車 client store
// 登入用戶不讀這個 store；server 撈 DB cart 後直接傳 props。
// 同 (productId, grind, pkg) 三元組視為同品項，qty 加總。

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type LocalCartItem = {
  productId: string;
  qty: number;
  grind?: string;
  pkg?: string;
};

type CartStore = {
  items: LocalCartItem[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  add: (item: LocalCartItem) => void;
  setQty: (productId: string, grind: string | undefined, pkg: string | undefined, qty: number) => void;
  remove: (productId: string, grind: string | undefined, pkg: string | undefined) => void;
  clear: () => void;
};

const sameKey = (a: LocalCartItem, productId: string, grind?: string, pkg?: string) =>
  a.productId === productId && (a.grind ?? null) === (grind ?? null) && (a.pkg ?? null) === (pkg ?? null);

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      add: (item) =>
        set((s) => {
          const idx = s.items.findIndex((i) => sameKey(i, item.productId, item.grind, item.pkg));
          if (idx >= 0) {
            const next = [...s.items];
            next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
            return { items: next };
          }
          return { items: [...s.items, item] };
        }),
      setQty: (productId, grind, pkg, qty) =>
        set((s) => {
          if (qty <= 0) {
            return { items: s.items.filter((i) => !sameKey(i, productId, grind, pkg)) };
          }
          return {
            items: s.items.map((i) =>
              sameKey(i, productId, grind, pkg) ? { ...i, qty } : i,
            ),
          };
        }),
      remove: (productId, grind, pkg) =>
        set((s) => ({
          items: s.items.filter((i) => !sameKey(i, productId, grind, pkg)),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "coffee-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

// 件數總和 selector（供 Masthead badge 使用）
export const selectCartCount = (s: CartStore) =>
  s.items.reduce((acc, i) => acc + i.qty, 0);
