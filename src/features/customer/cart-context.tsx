"use client";

import * as React from "react";

export interface CartItem {
  id: string; // menuItemId
  name: string;
  pricePaise: number;
  quantity: number;
  dietaryType?: string;
  specialInstructions?: string;
  imageUrl?: string;
}

interface CartContextType {
  restaurantId: string | null;
  tableId: string | null;
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItemsCount: number;
  totalEstimatedPaise: number;
  idempotencyKey: string;
  regenerateIdempotencyKey: () => string;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CartProvider({
  restaurantId,
  tableId,
  children,
}: {
  restaurantId: string;
  tableId: string;
  children: React.ReactNode;
}) {
  const storageKey = `scanorder_cart_${restaurantId}_${tableId}`;

  const [items, setItems] = React.useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [idempotencyKey, setIdempotencyKey] = React.useState<string>(() => {
    if (typeof window === "undefined") return generateIdempotencyKey();
    try {
      const stored = sessionStorage.getItem(`${storageKey}_key`);
      if (stored) return stored;
      const newKey = generateIdempotencyKey();
      sessionStorage.setItem(`${storageKey}_key`, newKey);
      return newKey;
    } catch {
      return generateIdempotencyKey();
    }
  });

  // Sync with session storage
  React.useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Storage unavailable
    }
  }, [items, storageKey]);

  const regenerateIdempotencyKey = () => {
    const newKey = generateIdempotencyKey();
    setIdempotencyKey(newKey);
    try {
      sessionStorage.setItem(`${storageKey}_key`, newKey);
    } catch {
      // Ignore
    }
    return newKey;
  };

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter((i): i is CartItem => i !== null)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    regenerateIdempotencyKey();
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  };

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalEstimatedPaise = items.reduce(
    (sum, item) => sum + item.pricePaise * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        restaurantId,
        tableId,
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItemsCount,
        totalEstimatedPaise,
        idempotencyKey,
        regenerateIdempotencyKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
