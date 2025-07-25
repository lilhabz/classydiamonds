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
// Now includes the old aliases `price` & `discountedPrice`
interface CartItem {
  id: string;
  name: string;
  originalPrice: number; // pre‑discount
  salePrice: number; // post‑discount
  price: number; // ← alias for salePrice
  discountedPrice?: number; // ← alias for salePrice when there was a discount
  image: string;
  quantity: number;
}

// Input shape when you call addToCart(...)
type CartItemInput = {
  id: string;
  name: string;
  price: number; // original price
  discountedPrice?: number; // optional discounted price
  image: string;
  quantity: number;
};

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItemInput) => void;
  removeFromCart: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;
  addedItemName: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}

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

  // ➕ Add (or bump quantity)
  const addToCart = (item: CartItemInput) => {
    setCartItems((prev) => {
      // 1️⃣ compute sale price
      const sale = item.discountedPrice ?? item.price;
      const isDiscounted = sale < item.price;

      // 2️⃣ build CartItem with aliases
      const newItem: CartItem = {
        id: item.id,
        name: item.name,
        originalPrice: item.price, // your “before” price
        salePrice: sale, // your “after” price
        price: item.price, // ← alias for original price
        discountedPrice: isDiscounted // ← alias for sale price
          ? sale
          : undefined,
        image: item.image,
        quantity: item.quantity,
      };

      // 3️⃣ add or increment
      const exists = prev.find((p) => p.id === newItem.id);
      if (exists) {
        return prev.map((p) =>
          p.id === newItem.id
            ? { ...p, quantity: p.quantity + newItem.quantity }
            : p
        );
      }
      return [...prev, newItem];
    });

    // your toast logic stays the same
    setAddedItemName(item.name);
    setTimeout(() => setAddedItemName(null), 2500);
  };

  // ❌ Remove
  const removeFromCart = (id: string) =>
    setCartItems((prev) => prev.filter((i) => i.id !== id));

  // ➕ / ➖ Qty
  const increaseQty = (id: string) =>
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i))
    );
  const decreaseQty = (id: string) =>
    setCartItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(i.quantity - 1, 1) } : i
      )
    );

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
