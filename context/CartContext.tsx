// 📦 context/CartContext.tsx — Adds slug support (backward-compatible) + size-aware keys + persistence

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// 🛠️ Types
// ————————————————————————————————————————————————————————————————
interface CartItem {
  id: string;
  slug: string; // ✅ stored on every item
  name: string;
  originalPrice: number; // pre-discount
  salePrice: number; // post-discount (what you charge)
  price: number; // alias (kept for compatibility)
  discountedPrice?: number; // alias when discounted
  image: string;
  quantity: number;
  size?: string; // ring size (optional)
}

// Input shape when you call addToCart(...)
type CartItemInput = {
  id: string;
  slug?: string; // ✅ optional for backward-compat; prefer passing it!
  name: string;
  price: number; // original price
  discountedPrice?: number; // optional discounted price
  image: string;
  quantity: number;
  size?: string; // ring size (optional)
};

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItemInput) => void;
  removeFromCart: (id: string, size?: string) => void; // optional size
  increaseQty: (id: string, size?: string) => void; // optional size
  decreaseQty: (id: string, size?: string) => void; // optional size
  clearCart: () => void;
  addedItemName: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}

// Helper to compare items by id+size
const keyOf = (obj: { id: string; size?: string }) =>
  `${obj.id}::${obj.size ?? ""}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addedItemName, setAddedItemName] = useState<string | null>(null);

  // 🧠 Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) setCartItems(JSON.parse(stored));
    } catch {}
  }, []);

  // 💾 Persist whenever cart changes
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // ➕ Add (or bump quantity) — respects id + size as a unique key
  const addToCart = (item: CartItemInput) => {
    setCartItems((prev) => {
      // 1) compute sale price
      const sale = item.discountedPrice ?? item.price;
      const isDiscounted = sale < item.price;

      // 2) build CartItem (ensure slug string exists)
      const newItem: CartItem = {
        id: item.id,
        slug: item.slug ?? "", // ✅ keeps old code working, but please pass slug going forward
        name: item.name,
        originalPrice: item.price,
        salePrice: sale,
        price: item.price, // alias for compatibility
        discountedPrice: isDiscounted ? sale : undefined,
        image: item.image,
        quantity: item.quantity,
        size: item.size,
      };

      // 3) add or increment (by id+size)
      const idx = prev.findIndex((p) => keyOf(p) === keyOf(newItem));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          quantity: copy[idx].quantity + newItem.quantity,
        };
        return copy;
      }
      return [...prev, newItem];
    });

    // simple toast signal
    setAddedItemName(item.name);
    setTimeout(() => setAddedItemName(null), 2500);
  };

  // ❌ Remove — by id+size
  const removeFromCart = (id: string, size?: string) =>
    setCartItems((prev) =>
      prev.filter((i) => keyOf(i) !== keyOf({ id, size }))
    );

  // ➕ Qty — by id+size
  const increaseQty = (id: string, size?: string) =>
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => keyOf(i) === keyOf({ id, size }));
      if (idx < 0) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
      return copy;
    });

  // ➖ Qty — by id+size (min 1)
  const decreaseQty = (id: string, size?: string) =>
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => keyOf(i) === keyOf({ id, size }));
      if (idx < 0) return prev;
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        quantity: Math.max(copy[idx].quantity - 1, 1),
      };
      return copy;
    });

  // 🧹 Clear
  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        increaseQty,
        decreaseQty,
        clearCart,
        addedItemName,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
