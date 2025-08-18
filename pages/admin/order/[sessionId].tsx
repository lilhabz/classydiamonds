// ✅ pages/admin/order/[sessionId].tsx – Order details + Refund 🔐

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import RefundDialog from "@/components/RefundDialog";

/* ---------- Helpers ---------- */
const safeStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v == null ? fallback : String(v);
const safeNum = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const toMoney = (n: number) => `$${n.toFixed(2)}`;

/* ---------- Types (mirror /api/admin/order.ts response) ---------- */
interface Item {
  name: string;
  quantity: number;
  price: number; // unit price we display
  discountedPrice?: number;
  image?: string;
  size?: string | null;
}
interface OrderAPI {
  orderNumber: number | null;
  items: Item[];
  amount: number; // dollars
  currency: string;
  paymentStatus: string;
  customerAddress: string; // printable
  address?: Record<string, any>;
  createdAt: string; // ISO
  shipped: boolean;
  archived: boolean;
  shipping_address_string: string;
}

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [order, setOrder] = useState<OrderAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRefund, setShowRefund] = useState(false);
  const sessionIdParam = router.query.sessionId;
  const sessionId =
    typeof sessionIdParam === "string"
      ? sessionIdParam
      : sessionIdParam?.[0] || "";

  useEffect(() => {
    if (!router.isReady) return;
    if (!session?.user?.isAdmin) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/order?orderId=${encodeURIComponent(sessionId)}`
        );
        const data = (await res.json()) as OrderAPI | { error: string };
        if ("error" in data) throw new Error(data.error);
        setOrder(data);
      } catch (e) {
        console.error("❌ Failed to fetch order:", e);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [router.isReady, session?.user?.isAdmin, sessionId]);

  // Refundable balance (in cents). If you later track refunded amounts, subtract them here.
  const refundableCents = useMemo(() => {
    const amt = safeNum(order?.amount, 0); // dollars
    return Math.max(0, Math.round(amt * 100)); // assume no prior refunds stored; adjust if you add refundedTotal
  }, [order?.amount]);

  // Admin actions
  const adminName =
    (session?.user as any)?.firstName ||
    safeStr(session?.user?.name).split(" ")[0] ||
    "Admin";

  const markShipped = async () => {
    if (!confirm("📦 Mark this order as shipped?")) return;
    const res = await fetch("/api/shipped", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: sessionId, adminName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert("❌ " + (data?.error || "Failed"));
    // refresh
    router.replace(router.asPath);
  };

  const archiveOrder = async () => {
    if (!confirm("🗂 Archive this order?")) return;
    const res = await fetch("/api/admin/archived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: sessionId, adminName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert("❌ " + (data?.error || "Failed"));
    router.push("/admin/archived");
  };

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return (
      <div className="p-6 text-red-300 font-semibold">❌ Unauthorized</div>
    );

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Order Details | Classy Diamonds</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold">Order Details</h1>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="px-3 py-2 rounded bg-[var(--bg-nav)] hover:bg-blue-600"
          >
            ← Back to Orders
          </Link>
        </div>
      </div>

      {loading ? (
        <p>Loading order…</p>
      ) : !order ? (
        <p className="text-red-300">Order not found.</p>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-[var(--bg-nav)] p-6 rounded-xl shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm text-gray-300">
                  🔢 Order #: {order.orderNumber ?? "N/A"} | 🆔{" "}
                  {sessionId.slice(-8)}
                </p>
                <p className="text-sm">
                  🧾 Date: {new Date(order.createdAt).toLocaleString()}
                </p>
                <p className="text-sm">
                  💳 Status: {order.paymentStatus || "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRefund(true)}
                  className="bg-indigo-600 px-4 py-2 rounded text-sm"
                >
                  Refund 💳
                </button>
                {!order.shipped && (
                  <button
                    onClick={markShipped}
                    className="bg-green-600 px-4 py-2 rounded text-sm"
                  >
                    Mark Shipped 🚚
                  </button>
                )}
                <button
                  onClick={archiveOrder}
                  className="bg-yellow-600 px-4 py-2 rounded text-sm"
                >
                  Archive 🗂
                </button>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-[var(--bg-nav)] p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-2">Shipping Address</h2>
            <p>
              {order.shipping_address_string || order.customerAddress || "—"}
            </p>
          </div>

          {/* Items */}
          <div className="bg-[var(--bg-nav)] p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-4">Items</h2>
            {order.items.length === 0 ? (
              <p className="text-sm text-red-300">⚠️ No items found.</p>
            ) : (
              <ul className="space-y-3">
                {order.items.map((i, idx) => {
                  const qty = i.quantity || 1;
                  const unit = safeNum(
                    i.discountedPrice ??
                      i.price /* already normalized in API */,
                    0
                  );
                  const line = unit * qty;
                  const img = safeStr(i.image, "");
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      {img ? (
                        <Image
                          src={img}
                          alt={i.name || "Item"}
                          width={56}
                          height={56}
                          className="rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-14 h-14 rounded bg-[#1f2a44] border border-[#364763] text-[10px] flex items-center justify-center">
                          No photo
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">
                          {i.name || "Item"}{" "}
                          {i.size && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white">
                              Size: {i.size}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-300">
                          x{qty} · {toMoney(unit)}
                        </div>
                      </div>
                      <div className="font-semibold">{toMoney(line)}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Totals */}
          <div className="bg-[var(--bg-nav)] p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-2">Payment</h2>
            <p className="text-sm">
              Currency: {order.currency?.toUpperCase() || "USD"}
            </p>
            <p className="text-sm">
              Total: <strong>{toMoney(safeNum(order.amount, 0))}</strong>
            </p>
            <p className="text-sm">
              Refundable balance:{" "}
              <strong>{toMoney(refundableCents / 100)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Refund modal */}
      {showRefund && order && (
        <RefundDialog
          // Your backend looks up by Stripe session id, so it's safe to pass the same id here
          orderId={sessionId}
          sessionId={sessionId}
          maxCents={refundableCents}
          onClose={() => setShowRefund(false)}
          onSuccess={async () => {
            setShowRefund(false);
            // Re-fetch to reflect any refund status you choose to store later
            router.replace(router.asPath);
          }}
        />
      )}
    </div>
  );
}
