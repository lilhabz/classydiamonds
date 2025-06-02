// 🚀 pages/success.tsx – Post-Checkout Thank You Page + “Leave a Review” Button (uses session_id) 🌟

// (Full file – replace everything in your current pages/success.tsx with the content below.)

import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router"; // <-- make sure we import useRouter
import { useCart } from "@/context/CartContext";

export default function SuccessPage() {
  const { clearCart } = useCart();
  const router = useRouter();
  // 🆕 Read Stripe’s session_id from the URL (if present)
  const { session_id } = router.query as { session_id?: string };

  useEffect(() => {
    // ✅ Delay cart clear so React renders this page fully before flushing context
    const timer = setTimeout(() => {
      clearCart(); // 🧼 Empty the cart right after showing the confirmation
    }, 100); // ⏱️ slight delay to prevent render glitches

    return () => clearTimeout(timer); // ♻️ Cleanup on unmount
  }, [clearCart]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Thank You | Classy Diamonds</title>
        <meta
          name="description"
          content="Order confirmation and thank you page."
        />
      </Head>

      {/* ✅ Confirmation Section */}
      <main className="flex flex-col items-center justify-center flex-grow px-4 pt-28 pb-20 text-center">
        <div className="bg-[var(--bg-nav)] rounded-2xl shadow-xl p-8 sm:p-12 max-w-xl">
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
            <div className="inline-block mt-2 px-6 py-3 bg-[var(--foreground)] text-[var(--bg-nav)] font-semibold rounded-full shadow hover:bg-gray-100 transition hover:scale-105 cursor-pointer">
              Continue Shopping
            </div>
          </Link>

          {/* 🆕 Leave a Review – only show if session_id is present */}
          {session_id && (
            <Link href={`/review/${session_id}`} passHref>
              <button
                type="button"
                className="mt-4 w-full inline-flex items-center justify-center px-6 py-3 bg-[var(--foreground)] text-[var(--bg-nav)] font-semibold rounded-full shadow hover:bg-gray-100 transition hover:scale-105 cursor-pointer"
              >
                📝 Leave a Review
              </button>
            </Link>
          )}
          {/*
            📝 Tailwind Explanation:
              - mt-4: adds top margin to separate from “Continue Shopping”
              - w-full inline-flex items-center justify-center: full-width, centered content
              - px-6 py-3: comfortable padding
              - bg-[var(--foreground)], text-[var(--bg-nav)]: matches your existing color scheme
              - font-semibold: slightly bolder text
              - rounded-full: pill‐shaped button
              - shadow: subtle drop shadow
              - hover:bg-gray-100 transition hover:scale-105: hover state styling
              - cursor-pointer: pointer cursor on hover
          */}
        </div>
      </main>
    </div>
  );
}
