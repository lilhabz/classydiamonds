// 📄 pages/cart.tsx – Redesigned Cart Page with Checkout Sidebar 🛍️💳

"use client";

import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function CartPage() {
  const { cartItems, removeFromCart, increaseQty, decreaseQty } = useCart();
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>Shopping Cart | Classy Diamonds</title>
        <meta name="description" content="View and manage your cart." />
      </Head>

      <Navbar />

      {/* 🛒 Header Section */}
      <section className="relative w-full h-[40vh] flex items-center justify-center text-center overflow-hidden -mt-20">
        <div className="absolute inset-0 bg-[#1f2a44] pointer-events-none" />
        <div className="relative z-10 px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Your Shopping Cart
          </h1>
          <p className="text-sm sm:text-base text-[#cfd2d6]">
            Review your items and checkout in one place.
          </p>
        </div>
      </section>

      {/* 🛍️ Cart + Checkout Layout */}
      <section className="px-4 sm:px-6 py-16 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-10">
        {/* 🛒 Cart Items */}
        <div className="flex-1 flex flex-col gap-6">
          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col md:flex-row gap-4 items-center bg-[#25304f] rounded-xl p-4 sm:p-6 shadow"
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
            <div className="text-center text-lg text-gray-400 flex flex-col gap-4 items-center">
              <p>Your cart is empty. Start shopping to add beautiful pieces!</p>
              <Link
                href="/jewelry"
                className="mt-2 px-6 py-3 bg-white text-[#1f2a44] rounded-xl font-semibold hover:bg-gray-100 transition hover:scale-105"
              >
                Browse Jewelry
              </Link>
            </div>
          )}
        </div>

        {/* 💳 Checkout Summary */}
        {cartItems.length > 0 && (
          <aside className="w-full lg:w-[400px] bg-[#25304f] rounded-xl shadow p-6 flex flex-col gap-6 sticky top-28 h-fit">
            <h2 className="text-xl font-semibold">Order Summary</h2>
            <div className="flex justify-between">
              <span className="text-sm">Subtotal</span>
              <span className="text-sm font-medium">
                ${total.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Shipping</span>
              <span className="text-sm font-medium">
                Calculated at checkout
              </span>
            </div>
            <hr className="border-[#2d3a56]" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${total.toLocaleString()}</span>
            </div>
            <button className="mt-3 px-6 py-3 bg-white text-[#1f2a44] rounded-full font-semibold hover:bg-gray-100 transition hover:scale-105">
              Proceed to Checkout
            </button>
          </aside>
        )}
      </section>

      <Footer />
    </div>
  );
}
