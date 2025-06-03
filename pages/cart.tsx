// 📤 pages/cart.tsx – Cart + Order Summary + Multi-Payment Checkout 💎

"use client";

import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

export default function CartPage() {
  const { cartItems, removeFromCart, increaseQty, decreaseQty, clearCart } =
    useCart();

  // ─── Replace single "address" string with a structured address object ───
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "", // 📞 Phone number
    // 👇 Structured shipping address fields:
    street1: "",
    street2: "",
    city: "",
    state: "PA", // default to Pennsylvania
    zip: "",
    country: "United States", // default to United States
    notes: "", // 📝 Order notes (e.g., engraving, ring size, delivery instructions)
    paymentMethod: "stripe", // 🏷️ Default to Stripe; placeholder for others
  });

  const [isLoading, setIsLoading] = useState(false);

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    // ─── Basic front-end validation ─────────────────────────────────────────
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.street1 ||
      !formData.city ||
      !formData.state ||
      !formData.zip ||
      !formData.country
    ) {
      alert("❌ Please fill in all required fields (marked with *).");
      return;
    }

    setIsLoading(true);
    try {
      // ─── Decide which payment flow based on paymentMethod ────────────────
      if (formData.paymentMethod === "stripe") {
        // ─── Stripe checkout ───────────────────────────────────────────────
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cartItems,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: {
              street1: formData.street1,
              street2: formData.street2,
              city: formData.city,
              state: formData.state,
              zip: formData.zip,
              country: formData.country,
            },
            notes: formData.notes,
            paymentMethod: "stripe", // 🏷️ Let backend know
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
      } else if (formData.paymentMethod === "paypal") {
        // ─── Placeholder: PayPal Checkout ─────────────────────────────────
        // 👇 You’ll need to create /api/checkout/paypal to handle PayPal sessions
        const response = await fetch("/api/checkout/paypal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cartItems,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: {
              street1: formData.street1,
              street2: formData.street2,
              city: formData.city,
              state: formData.state,
              zip: formData.zip,
              country: formData.country,
            },
            notes: formData.notes,
            paymentMethod: "paypal",
          }),
        });

        const text = await response.text();
        try {
          const data = JSON.parse(text);
          if (data?.redirectUrl) {
            window.location.href = data.redirectUrl;
          } else {
            alert("❌ PayPal checkout failed. No redirect URL.");
            console.error("❌ Raw response:", text);
          }
        } catch (err) {
          alert("❌ PayPal checkout failed. Invalid JSON response.");
          console.error("❌ Could not parse response:", text);
        }
      } else {
        // ─── Placeholder: Other payment methods ─────────────────────────────
        // 🔧 For future upgrades: Apple Pay, Google Pay, etc.
        alert("🚧 Payment method not implemented yet.");
      }
    } catch (error) {
      console.error("❌ Checkout fetch error:", error);
      alert("Checkout failed. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Array of U.S. States for dropdown ───────────────────────────────────
  const usStates = [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
  ];

  // ─── Array of Countries for dropdown (few examples) ─────────────────────
  const countries = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Germany",
    "France",
    "Mexico",
    "Japan",
    "China",
    "India",
  ];

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

        {/* 📋 Order Summary + Multi-Payment Checkout */}
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
            {/* ─── Name, Email, Phone ─────────────────────────────────────────── */}
            <input
              type="text"
              name="name"
              placeholder="Full Name *"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address *"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />
            <input
              type="text"
              name="phone"
              placeholder="Phone Number *"
              required
              value={formData.phone}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />

            {/* ─── Full Shipping Address Fields ───────────────────────────────── */}
            <input
              type="text"
              name="street1"
              placeholder="Street Address Line 1 *"
              required
              value={formData.street1}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />
            <input
              type="text"
              name="street2"
              placeholder="Street Address Line 2 (Apt, Suite, etc.)"
              value={formData.street2}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />
            <input
              type="text"
              name="city"
              placeholder="City *"
              required
              value={formData.city}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />

            {/* ─── State Dropdown ────────────────────────────────────────────── */}
            <select
              name="state"
              required
              value={formData.state}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            >
              <option value="" disabled>
                Select State *
              </option>
              {usStates.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              name="zip"
              placeholder="ZIP/Postal Code *"
              required
              value={formData.zip}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            />

            {/* ─── Country Dropdown ──────────────────────────────────────────── */}
            <select
              name="country"
              required
              value={formData.country}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            >
              <option value="" disabled>
                Select Country *
              </option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* ─── Payment Method Selector ─────────────────────────────────────── */}
            <select
              name="paymentMethod"
              required
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
            >
              <option value="stripe">Pay with Stripe</option>
              <option value="paypal">Pay with PayPal</option>
              {/* 🔧 Placeholder: Add more payment providers here */}
            </select>

            {/* ─── Order Notes ─────────────────────────────────────────────────── */}
            <textarea
              name="notes"
              placeholder="Order Notes (e.g. engraving, ring size, delivery instructions)"
              value={formData.notes}
              onChange={handleInputChange}
              className="px-4 py-2 rounded bg-white text-[#1f2a44]"
              rows={3}
            />

            {/* ─── Submit Button ──────────────────────────────────────────────── */}
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
