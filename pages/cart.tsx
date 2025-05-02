// 📄 pages/cart.tsx – Dynamic Cart with Quantity Controls + Compact UX Enhancements

"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/context/CartContext"; // 🛒 Use cart context

export default function CartPage() {
  const { cartItems, removeFromCart, increaseQty, decreaseQty } = useCart();

  // 💰 Calculate total cost
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      {/* 🌐 Metadata */}
      <Head>
        <title>Shopping Cart | Classy Diamonds</title>
        <meta
          name="description"
          content="View and manage your Classy Diamonds shopping cart."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      {/* 🛒 Hero Header */}
      <section className="relative w-full h-[40vh] flex items-center justify-center text-center overflow-hidden -mt-20">
        <div className="absolute inset-0 bg-[#1f2a44] pointer-events-none" />
        <div className="relative z-10 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-[#e0e0e0]">
            Your Shopping Cart
          </h1>
          <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto text-[#cfd2d6]">
            Review your items and proceed to checkout when you're ready.
          </p>
        </div>
      </section>

      {/* 🛍️ Cart Items */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full flex flex-col gap-10">
        {cartItems.length > 0 ? (
          <>
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col md:flex-row gap-4 items-center bg-[#25304f] rounded-2xl p-4 sm:p-6 shadow-md"
              >
                {/* 🖼️ Image */}
                <div className="w-full md:w-[120px] h-[120px] overflow-hidden rounded-xl shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 📝 Info */}
                <div className="flex-1 w-full text-center md:text-left">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#cfd2d6] mb-1">
                    {item.name}
                  </h2>
                  <p className="text-sm text-gray-400">
                    ${item.price.toLocaleString()} each
                  </p>
                  <p className="text-sm text-gray-400 mb-3">
                    Subtotal: ${(item.price * item.quantity).toLocaleString()}
                  </p>

                  {/* 🔢 Quantity Controls */}
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <button
                      onClick={() => decreaseQty(item.id)}
                      className="w-8 h-8 rounded-full bg-gray-700 text-white text-xl hover:bg-gray-600"
                    >
                      −
                    </button>
                    <span className="text-base font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => increaseQty(item.id)}
                      className="w-8 h-8 rounded-full bg-gray-700 text-white text-xl hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* ❌ Remove Button */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="md:ml-auto px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            ))}

            {/* 💰 Total Summary */}
            <div className="pt-8 text-center border-t border-[#2f3d5a]">
              <p className="text-xl font-semibold mb-4">
                Total: ${total.toLocaleString()}
              </p>
              <button className="px-8 py-3 bg-white text-[#1f2a44] rounded-full font-semibold text-sm sm:text-base hover:bg-gray-100 transition hover:scale-105">
                Proceed to Checkout
              </button>
            </div>
          </>
        ) : (
          // 🕳️ Empty Cart Message
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
    </div>
  );
}
