// ✅ pages/admin/completed.tsx – Completed Orders (refund-ready) 🔐🛠️

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import RefundDialog from "@/components/RefundDialog";

interface OrderItem {
  name: string;
  quantity?: number | string;
  price?: number | string;
  discountedPrice?: number | string;
  salePrice?: number | string;
  originalPrice?: number | string;
  unitPrice?: number | string; // ✅ new flow support
  image?: string;
  size?: string;
}

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items?: OrderItem[];
  amount: number | string; // dollars
  refundedTotal?: number | string; // cents stored in DB; may come back as string
  createdAt: string;
  stripeSessionId: string;
  orderNumber?: number;
  shippedAt?: string;
  trackingNumber?: string;
  carrier?: string;
  trackingEmailSentAt?: string;
  delivered?: boolean;
  deliveredAt?: string;
  archived?: boolean;
}

/** Robust number parser: accepts number or string like "$1,234.56". */
function n(v: unknown, d = 0): number {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, ""); // strip $, commas, spaces
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : d;
  }
  return d;
}

export default function CompletedOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [trackingInputs, setTrackingInputs] = useState<
    Record<string, { trackingNumber: string; carrier: string }>
  >({});
  const [savedTracking, setSavedTracking] = useState<Record<string, string>>(
    {}
  );
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>(
    {}
  );
  const [refundTarget, setRefundTarget] = useState<{
    sessionId: string;
    maxCents: number;
  } | null>(null);

  const itemsPerPage = 5;

  useEffect(() => {
    if (session?.user?.isAdmin) fetchCompletedOrders();
  }, [session]);

  const fetchCompletedOrders = async () => {
    try {
      const res = await fetch("/api/admin/completed");
      const data = await res.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      const saved: Record<string, string> = {};
      (data.orders || []).forEach((o: Order) => {
        if (o.trackingNumber) saved[o.stripeSessionId] = o.trackingNumber;
      });
      setSavedTracking(saved);
    } catch (err) {
      console.error("❌ Failed to fetch completed orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const markDelivered = async (orderId: string) => {
    if (!confirm(`📬 Mark this order as delivered?\nOrder ID: ${orderId}`))
      return;
    try {
      const adminName =
        (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, adminName }),
      });
      const result = await res.json();
      if (res.ok) fetchCompletedOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error marking delivered:", err);
    }
  };

  const updateTracking = async (orderId: string) => {
    const input = trackingInputs[orderId];
    if (!input?.trackingNumber) {
      alert("❌ Please enter a tracking number.");
      return;
    }
    if (savedTracking[orderId] === input.trackingNumber) return;
    try {
      setSavingTracking((p) => ({ ...p, [orderId]: true }));
      const adminName =
        (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          trackingNumber: input.trackingNumber,
          carrier: input.carrier,
          adminName,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setSavedTracking((prev) => ({
          ...prev,
          [orderId]: input.trackingNumber,
        }));
        alert("✅ Tracking saved and email sent.");
        fetchCompletedOrders();
      } else {
        alert("❌ " + result.error);
      }
    } catch (err) {
      console.error("❌ Error updating tracking:", err);
    } finally {
      setSavingTracking((p) => ({ ...p, [orderId]: false }));
    }
  };

  const archiveOrder = async (orderId: string) => {
    if (!confirm(`🗂 Archive this order?\nOrder ID: ${orderId}`)) return;
    try {
      const adminName =
        (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/admin/archived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, adminName }),
      });
      const result = await res.json();
      if (res.ok) fetchCompletedOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error archiving order:", err);
    }
  };

  const openRefund = (o: Order) => {
    const sessionId = o.stripeSessionId;
    if (!sessionId) return alert("❌ Missing Stripe session id on this order.");
    const totalCents = Math.max(0, Math.round(n(o.amount) * 100)); // dollars -> cents
    const refundedCents = Math.max(0, Math.round(n(o.refundedTotal))); // already cents
    const maxCents = Math.max(0, totalCents - refundedCents);
    if (maxCents <= 0) return alert("Nothing left to refund for this order.");
    setRefundTarget({ sessionId, maxCents });
  };

  const filteredOrders = orders.filter((order) => {
    if (order.archived || order.delivered) return false;
    const q = searchQuery.toLowerCase();
    const matchQ =
      (order.customerName || "").toLowerCase().includes(q) ||
      (order.customerEmail || "").toLowerCase().includes(q) ||
      (order.stripeSessionId || "").toLowerCase().includes(q);
    const date = new Date(order.shippedAt || "");
    const after = startDate ? date >= new Date(startDate) : true;
    const before = endDate ? date <= new Date(endDate) : true;
    return matchQ && after && before;
  });

  const itemsPerPageSafe = Math.max(1, itemsPerPage);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / itemsPerPageSafe)
  );
  const pageData = filteredOrders.slice(
    (currentPage - 1) * itemsPerPageSafe,
    currentPage * itemsPerPageSafe
  );

  if (status === "loading")
    return <div className="p-6">Checking access...</div>;
  if (!session?.user?.isAdmin)
    return (
      <div className="p-6 text-red-300 font-semibold">
        ❌ Unauthorized – Admins only
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Completed Orders | Classy Diamonds</title>
      </Head>
      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>
      <h1 className="text-3xl font-serif font-bold tracking-wide mb-6">
        🛠️ Admin Dashboard
      </h1>

      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
        <Link href="/admin" className="hover:text-yellow-300">
          📦 Orders
        </Link>
        <Link href="/admin/completed" className="text-yellow-400">
          ✅ Shipped
        </Link>
        <Link href="/admin/delivered" className="hover:text-yellow-300">
          📬 Delivered
        </Link>
        <Link href="/admin/archived" className="hover:text-yellow-300">
          🗂 Archived
        </Link>
        <Link href="/admin/products" className="hover:text-yellow-300">
          🛠 Products
        </Link>
        <Link href="/admin/custom-photos" className="hover:text-yellow-300">
          🖼 Custom
        </Link>
        <Link href="/admin/logs" className="hover:text-yellow-300">
          📝 Logs
        </Link>
      </nav>

      {loading ? (
        <p>Loading shipped orders...</p>
      ) : pageData.length === 0 ? (
        <p>No matching orders found.</p>
      ) : (
        <>
          {/* 🔍 Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-6">
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              className="w-full sm:w-1/3 mb-2 sm:mb-0 px-4 py-2 rounded bg-[var(--bg-nav)] text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 rounded bg-[#2e3a58] text-white"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 rounded bg-[#2e3a58] text-white"
            />
          </div>

          {/* 🧾 Orders */}
          <div className="space-y-10">
            {pageData.map((order) => {
              const totalCents = Math.max(0, Math.round(n(order.amount) * 100));
              const refundedCents = Math.max(
                0,
                Math.round(n(order.refundedTotal))
              );
              const refundableCents = Math.max(0, totalCents - refundedCents);

              return (
                <div
                  key={order._id}
                  className="bg-[var(--bg-nav)] p-6 rounded-xl shadow"
                >
                  <h2 className="text-xl font-semibold mb-1">
                    {order.customerName} ({order.customerEmail})
                  </h2>
                  <p className="text-sm text-gray-300 mb-2">
                    🔢 Order #: {order.orderNumber ?? "N/A"} | 🆔{" "}
                    {order.stripeSessionId.slice(-8)}
                  </p>
                  <p className="mb-2">📍 {order.customerAddress}</p>
                  <p className="mb-4">
                    🧾 Shipped:{" "}
                    {new Date(order.shippedAt || "").toLocaleString()}
                  </p>

                  {order.trackingNumber ? (
                    <p>
                      <strong>Tracking:</strong> {order.trackingNumber}
                      {order.carrier ? ` (${order.carrier})` : ""}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                      <select
                        value={
                          trackingInputs[order.stripeSessionId]?.carrier ||
                          "USPS"
                        }
                        onChange={(e) =>
                          setTrackingInputs((prev) => ({
                            ...prev,
                            [order.stripeSessionId]: {
                              ...(prev[order.stripeSessionId] || {
                                trackingNumber: "",
                                carrier: "USPS",
                              }),
                              carrier: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 rounded bg-[#2e3a58] text-white"
                      >
                        <option value="USPS">USPS</option>
                        <option value="UPS">UPS</option>
                        <option value="FedEx">FedEx</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Tracking #"
                        value={
                          trackingInputs[order.stripeSessionId]
                            ?.trackingNumber || ""
                        }
                        onChange={(e) =>
                          setTrackingInputs((prev) => ({
                            ...prev,
                            [order.stripeSessionId]: {
                              ...(prev[order.stripeSessionId] || {
                                trackingNumber: "",
                                carrier: "USPS",
                              }),
                              trackingNumber: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 rounded bg-[#2e3a58] text-white flex-1"
                      />
                      {(() => {
                        const inputVal =
                          trackingInputs[order.stripeSessionId]
                            ?.trackingNumber || "";
                        const isSaved =
                          !!inputVal &&
                          savedTracking[order.stripeSessionId] === inputVal;
                        const isSaving = savingTracking[order.stripeSessionId];
                        return (
                          <button
                            onClick={() =>
                              updateTracking(order.stripeSessionId)
                            }
                            disabled={isSaved || isSaving}
                            className="bg-green-600 px-3 py-1 rounded text-sm disabled:opacity-50"
                          >
                            {isSaved
                              ? "✅ Saved"
                              : isSaving
                              ? "Saving..."
                              : "Save Tracking"}
                          </button>
                        );
                      })()}
                    </div>
                  )}

                  <div className="mt-4">
                    <strong>Items:</strong>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {order.items.map((item, i) => {
                          const qty = Math.max(
                            1,
                            Math.round(n(item.quantity, 1))
                          );

                          // ✅ prefer unitPrice (new), then sale/discount, then legacy
                          const unit =
                            n(item.unitPrice) ||
                            n(item.salePrice) ||
                            n(item.discountedPrice) ||
                            n(item.originalPrice) ||
                            n(item.price);

                          const base =
                            n(item.originalPrice) || n(item.price) || unit;

                          const lineOrig = base * qty;
                          const lineSale = unit * qty;

                          const safeImage =
                            item.image && item.image.trim() !== ""
                              ? item.image
                              : "/products/gray-placeholder.jpg";

                          return (
                            <li key={i} className="flex items-center gap-2">
                              <Image
                                src={safeImage}
                                alt={item.name || "Product image"}
                                width={48}
                                height={48}
                                className="rounded object-cover"
                                unoptimized
                              />

                              {/* 👉 NEW: show unit price next to the picture */}
                              <div className="flex flex-col">
                                <div className="font-normal">
                                  {item.name || "Unnamed"}
                                  {item.size && (
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white align-middle">
                                      Size: {item.size}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-300 mt-0.5">
                                  Unit: ${unit.toFixed(2)}
                                </div>
                              </div>

                              <span className="ml-2">
                                – x{qty} –{" "}
                                {unit < base ? (
                                  <>
                                    <span className="line-through mr-1">
                                      ${lineOrig.toFixed(2)}
                                    </span>
                                    <span className="text-green-400">
                                      ${lineSale.toFixed(2)}
                                    </span>
                                  </>
                                ) : (
                                  <span>${lineSale.toFixed(2)}</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-red-300 mt-2">
                        ⚠️ No item data available.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-lg font-semibold">
                      💰 Total: ${n(order.amount).toFixed(2)}
                      {refundedCents > 0 && (
                        <span className="ml-2 text-sm text-gray-300">
                          • Refunded ${(refundedCents / 100).toFixed(2)}
                        </span>
                      )}
                    </span>
                    <div className="space-x-2">
                      <Link href={`/admin/order/${order.stripeSessionId}`}>
                        <span className="bg-blue-500 px-4 py-2 rounded text-sm cursor-pointer">
                          View 🔍
                        </span>
                      </Link>
                      <button
                        onClick={() => openRefund(order)}
                        className="bg-indigo-600 px-4 py-2 rounded text-sm disabled:opacity-60"
                        disabled={refundableCents <= 0}
                        title={
                          refundableCents <= 0
                            ? "Nothing left to refund"
                            : `Refund up to $${(refundableCents / 100).toFixed(
                                2
                              )}`
                        }
                      >
                        Refund 💳
                      </button>
                      <button
                        onClick={() => markDelivered(order.stripeSessionId)}
                        className="bg-blue-600 px-4 py-2 rounded text-sm"
                      >
                        Delivered 📬
                      </button>
                      <button
                        onClick={() => archiveOrder(order.stripeSessionId)}
                        className="bg-yellow-600 px-4 py-2 rounded text-sm"
                      >
                        Archive 🗂
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 📄 Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded ${
                    currentPage === i + 1
                      ? "bg-blue-600"
                      : "bg-[#2e3a58] hover:bg-blue-500"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-8 text-sm text-red-300 underline"
          >
            Exit Admin Panel 🔒
          </button>
        </>
      )}

      {/* 💳 Refund modal */}
      {refundTarget && (
        <RefundDialog
          orderId={refundTarget.sessionId} // backend accepts either; will fall back to stripeSessionId
          sessionId={refundTarget.sessionId}
          maxCents={refundTarget.maxCents}
          onClose={() => setRefundTarget(null)}
          onSuccess={async () => {
            setRefundTarget(null);
            await fetchCompletedOrders();
          }}
        />
      )}
    </div>
  );
}
