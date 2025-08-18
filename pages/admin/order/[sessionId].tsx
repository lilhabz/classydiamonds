// ✅ pages/admin/order/[sessionId].tsx – Order details + Refund (unit price + refunded math) 🔐

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

// Robust number parser: accepts number or "$1,234.56" strings
const n = (v: unknown, d = 0): number => {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, "");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : d;
  }
  return d;
};

const toMoney = (v: number) => `$${v.toFixed(2)}`;

/* ---------- Types (tolerant to API variations) ---------- */
interface Item {
  name?: string;
  quantity?: number | string;
  image?: string;
  size?: string | null;

  // price shape (new + legacy)
  unitPrice?: number | string;
  salePrice?: number | string;
  discountedPrice?: number | string;
  originalPrice?: number | string;
  price?: number | string;
}

interface OrderAPI {
  orderNumber?: number | null;
  items?: Item[];
  amount?: number | string; // dollars
  currency?: string;
  paymentStatus?: string;
  customerAddress?: string; // printable
  shipping_address_string?: string;
  createdAt?: string; // ISO
  shipped?: boolean;
  archived?: boolean;

  // helpful additions
  refundedTotal?: number | string; // cents
  stripeSessionId?: string;
  customerName?: string;
  customerEmail?: string;
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
        // Backend accepts either _id or stripeSessionId; here we pass the session id
        const res = await fetch(
          `/api/admin/order?orderId=${encodeURIComponent(sessionId)}`
        );
        const data = (await res.json()) as OrderAPI & { error?: string };
        if (data?.error) throw new Error(data.error);
        setOrder(data);
      } catch (e) {
        console.error("❌ Failed to fetch order:", e);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [router.isReady, session?.user?.isAdmin, sessionId]);

  // Totals (dollars → cents) and refundable math
  const totalCents = useMemo(
    () => Math.max(0, Math.round(n(order?.amount, 0) * 100)),
    [order?.amount]
  );
  const refundedCents = useMemo(
    () => Math.max(0, Math.round(n(order?.refundedTotal, 0))),
    [order?.refundedTotal]
  );
  const refundableCents = Math.max(0, totalCents - refundedCents);

  // Admin name for logs
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

  const shortSess = sessionId ? sessionId.slice(-8) : "—";

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
                  🔢 Order #: {order.orderNumber ?? "N/A"} | 🆔 {shortSess}
                </p>
                <p className="text-sm">
                  🧾 Date:{" "}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString()
                    : "—"}
                </p>
                <p className="text-sm">
                  💳 Status: {order.paymentStatus || "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRefund(true)}
                  className="bg-indigo-600 px-4 py-2 rounded text-sm"
                  disabled={refundableCents <= 0}
                  title={
                    refundableCents > 0
                      ? `Refund up to $${(refundableCents / 100).toFixed(2)}`
                      : "Nothing left to refund"
                  }
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
            {!Array.isArray(order.items) || order.items.length === 0 ? (
              <p className="text-sm text-red-300">⚠️ No items found.</p>
            ) : (
              <ul className="space-y-3">
                {order.items.map((i, idx) => {
                  const qty = Math.max(1, Math.round(n(i?.quantity, 1)));

                  // Prefer unit price → sale/discount → legacy/base
                  const unit =
                    n(i?.unitPrice) ||
                    n(i?.salePrice) ||
                    n(i?.discountedPrice) ||
                    n(i?.originalPrice) ||
                    n(i?.price);

                  const base = n(i?.originalPrice) || n(i?.price) || unit;

                  const lineOrig = base * qty;
                  const lineSale = unit * qty;

                  const hasImg = !!safeStr(i?.image).trim();
                  const imgSrc = hasImg
                    ? safeStr(i?.image)
                    : "/products/gray-placeholder.jpg";

                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <Image
                        src={imgSrc}
                        alt={safeStr(i?.name, "Item")}
                        width={56}
                        height={56}
                        className="rounded object-cover"
                        unoptimized
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {safeStr(i?.name, "Item")}{" "}
                          {i?.size && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white">
                              Size: {i.size}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-300">
                          x{qty} · {toMoney(unit)}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {unit < base ? (
                          <>
                            <span className="line-through text-gray-400 mr-2">
                              {toMoney(lineOrig)}
                            </span>
                            <span className="text-green-400">
                              {toMoney(lineSale)}
                            </span>
                          </>
                        ) : (
                          <span>{toMoney(lineSale)}</span>
                        )}
                      </div>
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
              Total: <strong>{toMoney(n(order.amount, 0))}</strong>
            </p>
            {refundedCents > 0 && (
              <p className="text-sm">
                Refunded: <strong>{toMoney(refundedCents / 100)}</strong>
              </p>
            )}
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
          // Pass Stripe session id so the API can match by stripeSessionId
          orderId={sessionId}
          sessionId={sessionId}
          maxCents={refundableCents}
          onClose={() => setShowRefund(false)}
          onSuccess={async () => {
            setShowRefund(false);
            router.replace(router.asPath);
          }}
        />
      )}
    </div>
  );
}
