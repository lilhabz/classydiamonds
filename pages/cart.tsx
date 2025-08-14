// 📤 pages/cart.tsx – Guest Checkout Enabled: Shipping Form + Prefill + Unified Payload 💎

"use client";

import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function CartPage() {
  const { cartItems, removeFromCart, increaseQty, decreaseQty } = useCart();
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(false);

  // 🧮 Calculate cart total using salePrice
  const total = cartItems.reduce(
    (sum, item) => sum + item.salePrice * item.quantity,
    0
  );

  // 🧾 Shipping / Contact fields (guest-friendly, prefilled if logged in)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");

  // 📥 Prefill from session (if available) but do not require login
  useEffect(() => {
    if (!session?.user) return;

    const u = session.user as any;
    setName((prev) => prev || u?.name || "");
    setEmail((prev) => prev || u?.email || "");
    setPhone((prev) => prev || u?.phone || "");

    const addr = u?.address || {};
    setLine1((prev) => prev || addr?.street || addr?.line1 || "");
    setLine2((prev) => prev || addr?.line2 || "");
    setCity((prev) => prev || addr?.city || "");
    setState((prev) => prev || addr?.state || "");
    setZip((prev) => prev || addr?.zip || addr?.postal_code || "");
    setCountry((prev) => prev || addr?.country || "US");
  }, [session]);

  const validate = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return false;
    }
    if (!name.trim()) {
      alert("Please enter your full name.");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email.");
      return false;
    }
    if (
      !line1.trim() ||
      !city.trim() ||
      !state.trim() ||
      !zip.trim() ||
      !country.trim()
    ) {
      alert(
        "Please complete your shipping address (street, city, state, ZIP, country)."
      );
      return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validate()) return;
    setIsLoading(true);

    try {
      const payload = {
        items: cartItems.map((i) => ({
          id: i.id,
          slug: i.slug,
          name: i.name,
          quantity: i.quantity,
          price: i.salePrice, // charge salePrice
          image: i.image,
          size: i.size ?? null,
        })),
        customer: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: {
            line1: line1.trim(),
            line2: line2.trim(),
            city: city.trim(),
            state: state.trim(),
            postal_code: zip.trim(),
            country: country.trim(),
          },
        },
        notes: "", // keep for future order notes if needed
        paymentMethod: "stripe",
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
                key={`${item.id}::${item.size ?? ""}`}
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

                  {/* 🆕 Ring Size Badge */}
                  {item.size && (
                    <div className="mt-1">
                      <span className="inline-block text-xs px-2 py-1 rounded-full bg-[#364763] text-white">
                        Size: {item.size}
                      </span>
                    </div>
                  )}

                  {/* 💲 Price Display */}
                  {item.salePrice < item.originalPrice ? (
                    <div className="text-sm sm:text-base mt-2">
                      <span className="line-through text-gray-400 mr-2">
                        ${item.originalPrice.toFixed(2)}
                      </span>
                      <span className="text-green-400 font-semibold">
                        ${item.salePrice.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2">
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
                      onClick={() => decreaseQty(item.id, item.size)}
                      className="w-7 h-7 rounded-full bg-gray-700 text-white text-lg hover:bg-gray-600"
                    >
                      −
                    </button>
                    <span className="text-base font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => increaseQty(item.id, item.size)}
                      className="w-7 h-7 rounded-full bg-gray-700 text-white text-lg hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* ❌ Remove Button */}
                <button
                  onClick={() => removeFromCart(item.id, item.size)}
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

        {/* 📋 Order Summary + Shipping + Checkout */}
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

          {/* 🚚 Shipping Details (works for guests & logged-in users) */}
          <div className="mt-2">
            <h3 className="text-lg font-semibold mb-3">Shipping Details</h3>

            <div className="grid grid-cols-1 gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name *"
                className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email *"
                type="email"
                className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
              />

              <input
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Street Address *"
                className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <input
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Apt, Suite, etc. (optional)"
                className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City *"
                  className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State *"
                  className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP / Postal Code *"
                  className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country *"
                  className="w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>
          </div>

          {/* 🔒 Checkout Button */}
          <div className="mt-2">
            <button
              onClick={handleCheckout}
              disabled={isLoading || cartItems.length === 0}
              className="w-full px-6 py-3 bg-white text-[#1f2a44] rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
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
