// 📄 pages/cart.tsx – Optimized Cart Page with Sticky Subtotal 💎

"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { cartItems, removeFromCart, increaseQty, decreaseQty } = useCart();

  // 💰 Total Price
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      {/* 🌐 Page Metadata */}
      <Head>
        <title>Shopping Cart | Classy Diamonds</title>
        <meta name="description" content="View and manage your cart." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      {/* 🛒 Hero Header */}
      <section className="relative w-full h-[40vh] flex items-center justify-center text-center overflow-hidden -mt-20">
        <div className="absolute inset-0 bg-[#1f2a44] pointer-events-none" />
        <div className="relative z-10 px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Your Shopping Cart
          </h1>
          <p className="text-sm sm:text-base text-[#cfd2d6]">
            Review your items and proceed to checkout.
          </p>
        </div>
      </section>

      {/* 🛍️ Cart Items */}
      <section className="px-4 sm:px-6 pb-32 pt-10 max-w-5xl mx-auto w-full flex flex-col gap-10">
        {cartItems.length > 0 ? (
          <>
            {/* 🔄 Render Each Item */}
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col md:flex-row gap-4 items-center bg-[#25304f] rounded-xl p-4 sm:p-6 shadow"
              >
                {/* 🖼️ Image */}
                <div className="w-full md:w-1/5 h-28 sm:h-32 overflow-hidden rounded-xl">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 📋 Info */}
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

                {/* ❌ Remove */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="mt-4 md:mt-0 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </>
        ) : (
          // 🕳️ Empty State
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
      </section>

      {/* 📌 Sticky Footer Bar with Subtotal */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-[#25304f] border-t border-[#2f3d5a] px-6 sm:px-10 py-4 flex flex-col sm:flex-row items-center justify-between z-50 shadow-inner">
          <p className="text-lg sm:text-xl font-semibold">
            Total: ${total.toLocaleString()}
          </p>
          <button className="mt-3 sm:mt-0 px-6 py-3 bg-white text-[#1f2a44] rounded-full font-semibold hover:bg-gray-100 transition hover:scale-105">
            Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );
}
