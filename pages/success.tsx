// 📅 pages/success.tsx – Post-Checkout Thank You Page 💎

import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

export default function SuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    // ✅ Delay cart clear so React renders this page fully before flushing context
    const timer = setTimeout(() => {
      clearCart(); // 🧼 Cart is cleared AFTER initial render tick
    }, 100); // ⏱️ slight delay prevents freeze bugs on client nav

    return () => clearTimeout(timer); // ♻️ Cleanup on unmount
  }, [clearCart]);

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-white">
      <Head>
        <title>Thank You | Classy Diamonds</title>
        <meta
          name="description"
          content="Order confirmation and thank you page."
        />
      </Head>

      {/* ✅ Confirmation Section */}
      <main className="flex flex-col items-center justify-center flex-grow px-4 pt-28 pb-20 text-center">
        <div className="bg-[#25304f] rounded-2xl shadow-xl p-8 sm:p-12 max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#d4af37] mb-4">
            Thank you for your purchase!
          </h1>
          <p className="text-md sm:text-lg text-gray-300 mb-6">
            We appreciate your order and hope you love your new jewelry. Your
            order is being processed and you’ll receive a confirmation email
            shortly.
          </p>

          {/* 🏱 Luxury visual – replace with a real image later! */}
          <div className="w-full h-48 sm:h-56 bg-[url('/luxury-placeholder.jpg')] bg-cover bg-center rounded-xl mb-6" />

          {/* 🛍️ Continue Shopping */}
          <Link href="/jewelry">
            <div className="inline-block mt-2 px-6 py-3 bg-white text-[#1f2a44] font-semibold rounded-full shadow hover:bg-gray-100 transition hover:scale-105 cursor-pointer">
              Continue Shopping
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
