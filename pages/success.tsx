// 🚀 pages/success.tsx – Post-Checkout Thank You Page + “Leave a Review” Button 📝💎
// (Full file – do not remove any existing lines; we’re simply inserting new logic.)

import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router"; // 🆕 Import useRouter to read query params
import { useCart } from "@/context/CartContext";

export default function SuccessPage() {
  const { clearCart } = useCart();
  const router = useRouter(); // 🆕 Initialize router
  const { orderId } = router.query as { orderId?: string }; // 🆕 Read “orderId” from URL (if present)

  useEffect(() => {
    // ✅ Delay cart clear so React renders this page fully before flushing context
    const timer = setTimeout(() => {
      clearCart(); // 🧼 Cart is cleared AFTER initial render tick
    }, 100); // ⏱️ slight delay prevents freeze bugs on client nav

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

          {/* 🆕 Leave a Review – only show if orderId is present */}
          {orderId && (
            <Link href={`/review/${orderId}`} passHref>
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
              - mt-4: adds spacing between “Continue Shopping” and this review button
              - w-full inline-flex items-center justify-center: full-width, centered content
              - px-6 py-3: consistent padding
              - bg-[var(--foreground)], text-[var(--bg-nav)]: match your site’s foreground/nav colors
              - font-semibold: slightly thicker text weight
              - rounded-full: pill-shaped button
              - shadow: subtle drop shadow
              - hover:bg-gray-100 transition hover:scale-105: hover state with slight enlarge 
              - cursor-pointer: ensures pointer on hover
          */}
        </div>
      </main>
    </div>
  );
}
