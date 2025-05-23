// 📤 pages/cart.tsx – Cart + Order Summary + Stripe Checkout 💎

"use client";

import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

export default function CartPage() {
  const { cartItems, removeFromCart, increaseQty, decreaseQty, clearCart } =
    useCart();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "", // 📞 Phone number
    address: "",
    notes: "", // 📝 Order notes (e.g., engraving, ring size, etc.)
  });

  const [isLoading, setIsLoading] = useState(false);

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
        }),
      });

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data?.url) {
          window.location.href = data.url;
        } else {
          alert("❌ Checkout failed. No URL returned.");
          console.error("❌ Raw response:", text);
        }
      } catch (err) {
        alert("❌ Checkout failed. Server response was not valid JSON.");
        console.error("❌ Could not parse response:", text);
      }
    } catch (error) {
      console.error("❌ Checkout fetch error:", error);
      alert("Checkout failed. See console.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Your Cart | Classy Diamonds</title>
        <meta name="description" content="Cart, summary, and checkout." />
      </Head>

      {/* 📦 Main Layout */}
      <main className="flex flex-col lg:flex-row px-4 sm:px-6 pt-24 pb-32 max-w-7xl mx-auto w-full gap-10">
        {/* 🛒 Cart Items */}
        <section className="lg:w-[65%] flex flex-col gap-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Your Shopping Cart</h1>
          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col md:flex-row gap-4 items-center bg-[var(--bg-nav)] rounded-xl p-4 sm:p-6 shadow"
              >
                <div className="w-full md:w-1/5 h-28 sm:h-32 overflow-hidden rounded-xl">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#cfd2d6]">
                    {item.name}
                  </h2>
                  <p className="text-sm text-gray-400">
                    ${item.price.toLocaleString()}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-sm text-gray-400 mt-1">
                      Subtotal: ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-center md:justify-start gap-3">
                    <button
                      onClick={() => decreaseQty(item.id)}
                      className="w-7 h-7 rounded-full bg-gray-700 text-white text-lg hover:bg-gray-600"
                    >
                      −
                    </button>
                    <span className="text-base font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => increaseQty(item.id)}
                      className="w-7 h-7 rounded-full bg-gray-700 text-white text-lg hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="mt-4 md:mt-0 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="text-center text-lg text-gray-400">
              <p>Your cart is empty. Start shopping!</p>
              <Link
                href="/jewelry"
                className="mt-4 inline-block px-6 py-3 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold hover:bg-gray-100 transition hover:scale-105"
              >
                Browse Jewelry
              </Link>
            </div>
          )}
        </section>

        {/* 📋 Order Summary + Stripe Checkout */}
        <aside className="lg:w-[35%] bg-[#25304f] rounded-xl p-6 shadow flex flex-col gap-6 sticky top-24 h-fit">
          <h2 className="text-xl font-bold border-b border-[var(--bg-page)] pb-2">
            Order Summary
          </h2>
          <p className="text-sm">Items: {cartItems.length}</p>
          <p className="text-lg font-semibold">
            Total: ${total.toLocaleString()}
          </p>

          {/* 🛒 Continue Shopping */}
          <Link
            href="/jewelry"
            className="text-sm text-white underline hover:text-gray-300"
          >
            ← Continue Shopping
          </Link>

          {/* 📟 Checkout Info */}
          <form onSubmit={handleCheckout} className="flex flex-col gap-4 mt-4">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              required
              value={formData.phone}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />
            <input
              type="text"
              name="address"
              placeholder="Shipping Address"
              required
              value={formData.address}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />
            <textarea
              name="notes"
              placeholder="Order Notes (e.g. engraving, ring size, delivery instructions)"
              value={formData.notes}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
              rows={3}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 px-6 py-3 bg-white text-[#1f2a44] rounded-full font-semibold hover:bg-gray-100 transition hover:scale-105"
            >
              {isLoading ? "Processing..." : "Proceed to Checkout"}
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}
