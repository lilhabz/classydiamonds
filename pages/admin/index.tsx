// ✅ pages/admin/index.tsx – Admin Orders (no CSV/PDF) 🔐🛠️ (hardened)

import { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import RefundDialog from "@/components/RefundDialog";

/* ---------- Safe helpers ---------- */
const safeStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v == null ? fallback : String(v);

const safeSlice = (v: unknown, start?: number, end?: number): string =>
  safeStr(v).slice(start, end);

const safeArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const safeNum = (v: unknown, fallback = 0): number =>
  typeof v === "number" && !Number.isNaN(v) ? v : fallback;

/* ---------- Types (make possibly-undefined fields optional to match API reality) ---------- */
interface OrderItem {
  name?: string;
  quantity?: number;
  price?: number;
  discountedPrice?: number;
  salePrice?: number;
  originalPrice?: number;
  image?: string | null;
  size?: string; // ring size
  unitPrice?: number; // new flow
}

interface Order {
  _id?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  shipping_address?: {
    street?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  shipping_address_string?: string;
  addressSource?: "Stripe" | "Account" | "Unknown";
  items?: OrderItem[];
  amount?: number; // dollars
  refundedTotal?: number; // cents (optional; may be absent on older orders)
  createdAt?: string | Date;
  stripeSessionId?: string;
  orderNumber?: number | null;
  shipped?: boolean;
  archived?: boolean;
  currency?: string;
  paymentStatus?: string;
}

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<{
    sessionId: string;
    maxCents: number;
  } | null>(null);
  const itemsPerPage = 5;

  // 📦 Fetch orders after admin session confirmed
  useEffect(() => {
    if (session?.user?.isAdmin) fetchOrders();
  }, [session]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = (await res.json()) as { orders?: Order[]; error?: string };
      setOrders(safeArray<Order>(json.orders));
    } catch (err) {
      console.error("❌ Failed to fetch orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  // 🚚 Mark as shipped
  async function confirmAndShip(orderStripeSessionId?: string) {
    const id = safeStr(orderStripeSessionId);
    if (!id) return alert("Missing order id");
    if (!confirm(`📦 Mark order ${id.slice(-8)} as shipped?`)) return;
    const adminName =
      (session?.user as any)?.firstName ||
      safeStr(session?.user?.name).split(" ")[0] ||
      "Admin";
    const res = await fetch("/api/shipped", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, adminName }),
    });
    if (res.ok) fetchOrders();
    else {
      const { error } = await res.json();
      alert("❌ " + error);
    }
  }

  // 🗂 Archive order
  async function archiveOrder(orderStripeSessionId?: string) {
    const id = safeStr(orderStripeSessionId);
    if (!id) return alert("Missing order id");
    if (!confirm(`🗂 Archive order ${id.slice(-8)}?`)) return;
    const adminName =
      (session?.user as any)?.firstName ||
      safeStr(session?.user?.name).split(" ")[0] ||
      "Admin";
    const res = await fetch("/api/admin/archived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, adminName }),
    });
    if (res.ok) fetchOrders();
    else {
      const { error } = await res.json();
      alert("❌ " + error);
    }
  }

  // 🔁 Open refund modal for an order
  function openRefund(o: Order) {
    const sessionId = safeStr(o.stripeSessionId);
    if (!sessionId) {
      alert("❌ Missing Stripe session id on this order.");
      return;
    }
    const totalCents = Math.max(0, Math.round(safeNum(o.amount, 0) * 100));
    const refundedCents = Math.max(0, Math.round(safeNum(o.refundedTotal, 0))); // already cents
    const maxCents = Math.max(0, totalCents - refundedCents);
    setRefundTarget({ sessionId, maxCents });
  }

  // 🔍 Filter & paginate (all guards)
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return safeArray<Order>(orders).filter((o) => {
      if (o.archived || o.shipped) return false;

      const name = safeStr(o.customerName).toLowerCase();
      const email = safeStr(o.customerEmail).toLowerCase();
      const sess = safeStr(o.stripeSessionId).toLowerCase();
      const matchQ =
        !q || name.includes(q) || email.includes(q) || sess.includes(q);

      const created = o.createdAt ? new Date(o.createdAt) : new Date(0);
      const after = start ? created >= start : true;
      const before = end ? created <= end : true;

      return matchQ && after && before;
    });
  }, [orders, searchQuery, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return (
      <div className="p-6 text-red-300 font-semibold">❌ Unauthorized</div>
    );

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Admin Orders | Classy Diamonds</title>
      </Head>
      <Breadcrumbs />
      <h1 className="text-3xl font-serif font-bold mb-6">🛠 Admin Dashboard</h1>

      {/* 📂 Navigation */}
      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
        <Link href="/admin" className="text-yellow-400">
          📦 Orders
        </Link>
        <Link href="/admin/completed" className="hover:text-yellow-300">
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

      {/* 🔍 Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search…"
          className="px-4 py-2 rounded bg-[var(--bg-nav)] text-white flex-1"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input
          type="date"
          className="px-2 py-1 rounded bg-[var(--bg-nav)] text-white"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="px-2 py-1 rounded bg-[var(--bg-nav)] text-white"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* 📦 Orders list */}
      <div id="print-area" className="space-y-8">
        {pageData.map((o) => {
          const orderId = safeStr(o._id);
          const customerName = safeStr(o.customerName, "Customer");
          const customerEmail = safeStr(o.customerEmail, "—");
          const shortSess = safeSlice(o.stripeSessionId, -8) || "—";
          const orderNo =
            typeof o.orderNumber === "number" ? o.orderNumber : null;

          // Address string
          const addrStr = o?.shipping_address
            ? `${safeStr(o.shipping_address.street)}${
                safeStr(o.shipping_address.line2)
                  ? `, ${safeStr(o.shipping_address.line2)}`
                  : ""
              }, ${safeStr(o.shipping_address.city)}, ${safeStr(
                o.shipping_address.state
              )} ${safeStr(o.shipping_address.zip)}, ${safeStr(
                o.shipping_address.country
              )}`
            : safeStr(o.shipping_address_string) || safeStr(o.customerAddress);

          // Created date
          const created = o.createdAt ? new Date(o.createdAt) : new Date();
          const createdLabel = isNaN(created as any)
            ? ""
            : created.toLocaleString();

          const list = safeArray<OrderItem>(o.items);

          // Refund math (for button label / sanity)
          const totalCents = Math.max(
            0,
            Math.round(safeNum(o.amount, 0) * 100)
          );
          const refundedCents = Math.max(
            0,
            Math.round(safeNum(o.refundedTotal, 0))
          );
          const refundableCents = Math.max(0, totalCents - refundedCents);

          return (
            <div
              key={orderId || shortSess}
              className="bg-[var(--bg-nav)] p-6 rounded-xl shadow"
            >
              <h2 className="text-xl font-semibold mb-1">
                {customerName} ({customerEmail})
              </h2>

              <p className="text-sm text-gray-300 mb-2">
                🔢 Order #: {orderNo ?? "N/A"} | 🆔 {shortSess}
              </p>

              <p className="mb-2">📍 {addrStr}</p>
              {o.addressSource && (
                <p className="text-xs text-gray-400 italic">
                  (Address Source: {o.addressSource})
                </p>
              )}

              <p className="mb-4">🧾 Date: {createdLabel}</p>

              <ul className="mb-4 list-disc pl-4 text-sm">
                {list.map((i, idx) => {
                  const qty = safeNum(i?.quantity, 1);
                  // Prefer unitPrice (new flow), else fallbacks
                  const displayUnit =
                    (typeof i?.salePrice === "number"
                      ? i?.salePrice
                      : undefined) ??
                    (typeof i?.discountedPrice === "number"
                      ? i?.discountedPrice
                      : undefined) ??
                    (typeof i?.unitPrice === "number"
                      ? i?.unitPrice
                      : undefined) ??
                    (typeof i?.originalPrice === "number"
                      ? i?.originalPrice
                      : undefined) ??
                    (typeof i?.price === "number" ? i?.price : 0);

                  const baseUnit =
                    (typeof i?.originalPrice === "number"
                      ? i?.originalPrice
                      : undefined) ??
                    (typeof i?.price === "number" ? i?.price : displayUnit);

                  const orig = safeNum(baseUnit) * qty;
                  const sale = safeNum(displayUnit) * qty;

                  const imgSrc = safeStr(i?.image, "");
                  const hasImg = imgSrc.trim().length > 0;

                  return (
                    <li key={idx} className="flex items-center gap-2">
                      {hasImg ? (
                        <Image
                          src={imgSrc}
                          alt={safeStr(i?.name, "Item")}
                          width={48}
                          height={48}
                          className="rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-[#1f2a44] border border-[#364763] text-[10px] flex items-center justify-center">
                          No photo
                        </div>
                      )}

                      <span>
                        {safeStr(i?.name, "Item")}
                        {i?.size && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white align-middle">
                            Size: {i.size}
                          </span>
                        )}{" "}
                        – x{qty} –{" "}
                        {sale < orig ? (
                          <>
                            <span className="line-through text-gray-400 mr-1">
                              ${orig.toFixed(2)}
                            </span>
                            <span className="text-green-400 font-semibold">
                              ${sale.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span>${sale.toFixed(2)}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">
                  💰 Total: ${safeNum(o.amount).toFixed(2)}
                  {refundedCents > 0 && (
                    <span className="ml-2 text-sm text-gray-300">
                      • Refunded ${(refundedCents / 100).toFixed(2)}
                    </span>
                  )}
                </span>
                <div className="space-x-2">
                  <Link href={`/admin/order/${o.stripeSessionId}`}>
                    <span className="bg-blue-600 px-4 py-2 rounded text-sm cursor-pointer">
                      View 🔍
                    </span>
                  </Link>
                  <button
                    onClick={() => openRefund(o)}
                    className="bg-indigo-600 px-4 py-2 rounded text-sm disabled:opacity-60"
                    disabled={refundableCents <= 0 || !o.stripeSessionId}
                    title={
                      !o.stripeSessionId
                        ? "Missing Stripe session id"
                        : refundableCents <= 0
                        ? "Nothing left to refund"
                        : `Refund up to $${(refundableCents / 100).toFixed(2)}`
                    }
                  >
                    Refund 💳
                  </button>
                  <button
                    onClick={() => confirmAndShip(o.stripeSessionId)}
                    className="bg-green-600 px-4 py-2 rounded text-sm"
                  >
                    Mark as Shipped 🚚
                  </button>
                  <button
                    onClick={() => archiveOrder(o.stripeSessionId)}
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
                  : "bg-[var(--bg-nav)] hover:bg-blue-500"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => (window.location.href = "/")}
        className="mt-8 text-sm text-red-300 underline"
      >
        Exit Admin Panel 🔒
      </button>

      {/* 💳 Refund modal (global for the page) */}
      {refundTarget && (
        <RefundDialog
          orderId={refundTarget.sessionId} // backend accepts sessionId or _id
          sessionId={refundTarget.sessionId} // Stripe Checkout session id
          maxCents={refundTarget.maxCents}
          onClose={() => setRefundTarget(null)}
          onSuccess={async () => {
            setRefundTarget(null);
            await fetchOrders(); // refresh list to reflect refundedTotal
          }}
        />
      )}
    </div>
  );
}
