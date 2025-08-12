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
  name: string;
  originalPrice: number; // pre-discount
  salePrice: number; // post-discount
  price: number; // alias (kept for compatibility)
  discountedPrice?: number; // alias when discounted
  image: string;
  quantity: number;
  size?: string; // 🆕 ring size (optional)
}

// Input shape when you call addToCart(...)
type CartItemInput = {
  id: string;
  name: string;
  price: number; // original price
  discountedPrice?: number; // optional discounted price
  image: string;
  quantity: number;
  size?: string; // 🆕 ring size (optional)
};

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItemInput) => void;
  removeFromCart: (id: string, size?: string) => void; // 🆕 optional size
  increaseQty: (id: string, size?: string) => void; // 🆕 optional size
  decreaseQty: (id: string, size?: string) => void; // 🆕 optional size
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
    const stored = localStorage.getItem("cart");
    if (stored) {
      setCartItems(JSON.parse(stored));
    }
  }, []);

  // 💾 Persist whenever cart changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // ➕ Add (or bump quantity) — respects id + size as a unique key
  const addToCart = (item: CartItemInput) => {
    setCartItems((prev) => {
      // 1️⃣ compute sale price
      const sale = item.discountedPrice ?? item.price;
      const isDiscounted = sale < item.price;

      // 2️⃣ build CartItem with aliases
      const newItem: CartItem = {
        id: item.id,
        name: item.name,
        originalPrice: item.price,
        salePrice: sale,
        price: item.price, // keep existing alias behavior
        discountedPrice: isDiscounted ? sale : undefined,
        image: item.image,
        quantity: item.quantity,
        size: item.size, // 🆕 carry size through
      };

      // 3️⃣ add or increment (by id+size)
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

    // toast logic stays the same
    setAddedItemName(item.name);
    setTimeout(() => setAddedItemName(null), 2500);
  };

  // ❌ Remove — by id+size (if size omitted, removes first match with that id)
  const removeFromCart = (id: string, size?: string) =>
    setCartItems((prev) =>
      prev.filter((i) => keyOf(i) !== keyOf({ id, size }))
    );

  // ➕ Qty — by id+size (fallback: first match if size not given)
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
