// 📤 pages/cart.tsx – Cart with Discount Display, Enhanced Pricing UX, and Address Prefill 💎

"use client";

import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import { useSession } from "next-auth/react"; // ← import session hook
import Breadcrumbs from "@/components/Breadcrumbs";

export default function CartPage() {
  const { cartItems, removeFromCart, increaseQty, decreaseQty, clearCart } =
    useCart();
  const { data: session } = useSession(); // ← grab session data
  const [isLoading, setIsLoading] = useState(false);

  // 🧮 Calculate cart total using salePrice
  const total = cartItems.reduce(
    (sum, item) => sum + item.salePrice * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          // ← pass user info into checkout metadata
          name: session?.user?.name || "",
          email: session?.user?.email || "",
          phone: (session?.user as any)?.phone || "",
          address: {
            street1: (session?.user as any)?.address?.street || "",
            street2: (session?.user as any)?.address?.line2 || "",
            city: (session?.user as any)?.address?.city || "",
            state: (session?.user as any)?.address?.state || "",
            zip: (session?.user as any)?.address?.zip || "",
            country: (session?.user as any)?.address?.country || "",
          },
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
      alert("Checkout failed. See console for details.");
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

      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
        <Breadcrumbs />
      </div>

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
                {/* 📸 Product Image */}
                <div className="w-full md:w-1/5 h-28 sm:h-32 overflow-hidden rounded-xl">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 📝 Product Info */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#cfd2d6]">
                    {item.name}
                  </h2>
                  {/* 💲 Price Display */}
                  {item.salePrice < item.originalPrice ? (
                    <div className="text-sm sm:text-base mt-1">
                      <span className="line-through text-gray-400 mr-2">
                        ${item.originalPrice.toFixed(2)}
                      </span>
                      <span className="text-green-400 font-semibold">
                        ${item.salePrice.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-1">
                      ${item.originalPrice.toFixed(2)}
                    </p>
                  )}
                  {/* 🧮 Subtotal if Quantity > 1 */}
                  {item.quantity > 1 && (
                    <p className="text-sm text-gray-400 mt-1">
                      Subtotal: ${(item.salePrice * item.quantity).toFixed(2)}
                    </p>
                  )}
                  {/* 🔢 Quantity Controls */}
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

                {/* ❌ Remove Button */}
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

        {/* 📋 Order Summary + Checkout */}
        <aside className="lg:w-[35%] bg-[#25304f] rounded-xl p-6 shadow flex flex-col gap-6 sticky top-24 h-fit">
          <h2 className="text-xl font-bold border-b border-[var(--bg-page)] pb-2">
            Order Summary
          </h2>
          <p className="text-sm">Items: {cartItems.length}</p>
          <p className="text-lg font-semibold">Total: ${total.toFixed(2)}</p>
          {/* 🛒 Continue Shopping */}
          <Link
            href="/jewelry"
            className="text-sm text-white underline hover:text-gray-300"
          >
            ← Continue Shopping
          </Link>
          {/* 🔒 Checkout Button */}
          <div className="mt-4">
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-white text-[#1f2a44] rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition hover:scale-105"
            >
              {isLoading ? (
                "Processing..."
              ) : (
                <>
                  🔒 <span>Secure Checkout</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
