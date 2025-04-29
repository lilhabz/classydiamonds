// 📄 pages/cart.tsx – Dynamic Cart with Quantity Controls + Mobile Optimized

"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Head from "next/head";
import { useCart } from "@/context/CartContext"; // 🛒 Use cart context

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    increaseQty,
    decreaseQty,
  } = useCart();

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
        <meta name="description" content="View and manage your Classy Diamonds shopping cart." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      {/* 🛒 Hero Header */}
      <section className="relative w-full h-[50vh] flex items-center justify-center text-center overflow-hidden -mt-20">
        <div className="absolute inset-0 bg-[#1f2a44] pointer-events-none" />
        <div className="relative z-10 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-[#e0e0e0]">
            Your Shopping Cart
          </h1>
          <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto text-[#cfd2d6]">
            Review your items and proceed to checkout when you're ready.
          </p>
        </div>
      </section>

      {/* 🛍️ Cart Items */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full flex flex-col gap-12">
        {/* 🔄 Real Cart Items */}
        {cartItems.length > 0 ? (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col md:flex-row gap-6 items-center bg-[#25304f] rounded-2xl p-6 shadow-md"
            >
              {/* 🖼️ Image */}
              <div className="w-full md:w-1/4 h-40 overflow-hidden rounded-xl">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 📝 Info + Quantity */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl sm:text-2xl font-semibold text-[#cfd2d6] mb-2">
                  {item.name}
                </h2>
                <p className="text-lg text-gray-400">
                  ${item.price.toLocaleString()}
                </p>

                {/* 🔢 Quantity Controls */}
                <div className="mt-4 flex items-center justify-center md:justify-start gap-4">
                  <button
                    onClick={() => decreaseQty(item.id)}
                    className="w-8 h-8 rounded-full bg-gray-700 text-white text-xl hover:bg-gray-600"
                  >
                    −
                  </button>
                  <span className="text-lg font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => increaseQty(item.id)}
                    className="w-8 h-8 rounded-full bg-gray-700 text-white text-xl hover:bg-gray-600"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ❌ Remove */}
              <button
                onClick={() => removeFromCart(item.id)}
                className="mt-4 md:mt-0 px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          // 🕳️ Empty State
          <div className="text-center text-lg text-gray-400">
            Your cart is empty. Start shopping to add beautiful pieces!
          </div>
        )}

        {/* 💰 Total & Checkout */}
        {cartItems.length > 0 && (
          <div className="flex flex-col gap-6 items-center text-center">
            <p className="text-xl sm:text-2xl font-semibold">
              Total: ${total.toLocaleString()}
            </p>
            <button className="px-10 py-4 bg-white text-[#1f2a44] rounded-full font-semibold text-base sm:text-lg hover:bg-gray-100 transition hover:scale-105">
              Proceed to Checkout
            </button>
          </div>
        )}
      </section>

      
    </div>
  );
}
