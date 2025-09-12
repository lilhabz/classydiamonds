// 🚀 pages/success.tsx – Post-Checkout Thank You Page (showing short orderNumber) 🌟

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useCart } from "@/context/CartContext";
import Breadcrumbs from "@/components/Breadcrumbs";

// ─── Define the shape of the response from /api/admin/order ─────────────────
interface SingleOrder {
  orderNumber: number | null;
  items: { name: string; quantity: number; price: number }[];
  amount: number;
  customerAddress: string;

  // 🆕 Optional fields (return these from /api/admin/order when possible)
  isGuest?: boolean;
  customerEmail?: string;

  createdAt: string;
}

export default function SuccessPage() {
  const { clearCart } = useCart();
  const router = useRouter();

  // 🆕 Read Stripe’s session_id from the URL (if present)
  const { session_id } = router.query as { session_id?: string };

  // ─── Local state to store fetched order details ───────────────────────────
  const [orderData, setOrderData] = useState<SingleOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState("");

  // ─── Clear cart shortly after rendering this page ────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      clearCart();
    }, 100); // slight delay
    return () => clearTimeout(timer);
  }, [clearCart]);

  // ─── Fetch the short orderNumber and other details from our API ───────────
  useEffect(() => {
    if (!session_id || typeof session_id !== "string") {
      setLoadingOrder(false);
      return;
    }

    // Fetch single order by Stripe session ID
    fetch(`/api/admin/order?orderId=${session_id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Order not found");
        }
        return res.json();
      })
      .then((data: SingleOrder) => {
        setOrderData(data);
      })
      .catch((err) => {
        console.error("❌ Error fetching order:", err);
        setOrderError("Could not load order details.");
      })
      .finally(() => {
        setLoadingOrder(false);
      });
  }, [session_id]);

  // 🆕 Prefill email in signup link if we have it
  const signupHref = useMemo(() => {
    const email = orderData?.customerEmail?.trim();
    const base = "/auth?mode=signup";
    if (email) {
      return `${base}&email=${encodeURIComponent(email)}&next=/account`;
    }
    return `${base}&next=/account`;
  }, [orderData?.customerEmail]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Thank You | Classy Diamonds</title>
        <meta
          name="description"
          content="Order confirmation and thank you page."
        />
      </Head>

      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
        <Breadcrumbs />
      </div>

      {/* ✅ Confirmation Section */}
      <main className="flex flex-col items-center justify-center flex-grow px-4 pt-28 pb-20 text-center">
        <div className="bg-[var(--bg-nav)] rounded-2xl shadow-xl p-8 sm:p-12 max-w-xl w-full">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#d4af37] mb-4">
            Thank you for your purchase!
          </h1>
          <p className="text-md sm:text-lg text-gray-300 mb-6">
            We appreciate your order and hope you love your new jewelry. Your
            order is being processed and you’ll receive a confirmation email
            shortly.
          </p>

          {/* 🆕 Show Short Order Number */}
          {loadingOrder ? (
            <p className="text-sm text-gray-400 mb-4">Loading order details…</p>
          ) : orderError ? (
            <p className="text-sm text-red-400 mb-4">{orderError}</p>
          ) : orderData && orderData.orderNumber !== null ? (
            <p className="text-lg font-semibold text-white mb-6">
              Your Order # is:{" "}
              <span className="text-[#d4af37]">#{orderData.orderNumber}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 mb-4">
              Unable to display order number.
            </p>
          )}

          {/* 🏱 Luxury visual – replace with a real image later! */}
          <div className="w-full h-48 sm:h-56 bg-[url('/luxury-placeholder.jpg')] bg-cover bg-center rounded-xl mb-6" />

          {/* 🛍️ Continue Shopping */}
          <Link href="/jewelry">
            <div className="inline-block mt-2 px-6 py-3 bg-[var(--foreground)] text-[var(--bg-nav)] font-semibold rounded-full shadow hover:bg-gray-100 transition hover:scale-105 cursor-pointer">
              Continue Shopping
            </div>
          </Link>

          {/* 📝 Leave a Review – only show if session_id is present */}
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

          {/* 🆕 Invite guest to create an account (only if order is marked guest) */}
          {!loadingOrder && !orderError && orderData?.isGuest === true && (
            <div className="mt-6 p-4 rounded-xl bg-[#25304f] border border-white/10 text-left">
              <h2 className="text-lg font-semibold mb-1">
                Create an account to track your order
              </h2>
              <p className="text-sm text-gray-300 mb-3">
                Save your receipt, track shipping, and view your order history.
                Use the same email you just checked out with
                {orderData?.customerEmail ? (
                  <>
                    :{" "}
                    <span className="font-medium text-white">
                      {orderData.customerEmail}
                    </span>
                  </>
                ) : (
                  "."
                )}
              </p>

              <Link href={signupHref}>
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-white text-[#1f2a44] font-semibold rounded-full shadow hover:bg-gray-100 transition hover:scale-105 cursor-pointer"
                >
                  ✨ Create Account
                </button>
              </Link>
            </div>
          )}
          {/* 
            Note: If your /api/admin/order doesn't yet return isGuest/customerEmail,
            this invite will simply stay hidden. When you add those fields to the API
            (isGuest true for guest orders, plus customerEmail), the block appears.
          */}
        </div>
      </main>
    </div>
  );
}
