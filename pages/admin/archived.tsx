// ✅ pages/admin/archived.tsx – Archived Orders (robust prices + unitPrice) 🔐🗂️

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface OrderItem {
  name?: string;
  quantity?: number | string;
  // support both new + legacy shapes (may arrive as string)
  unitPrice?: number | string;
  price?: number | string;
  discountedPrice?: number | string;
  salePrice?: number | string;
  originalPrice?: number | string;
  image?: string;
  size?: string;
}

interface Order {
  _id: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  items?: OrderItem[];
  amount?: number | string; // dollars
  createdAt?: string;
  stripeSessionId: string;
  orderNumber?: number;
  shippedAt?: string;
  archived?: boolean;
}

/** Robust number parser: accepts number or "$1,234.56" strings. */
function n(v: unknown, d = 0): number {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, "");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : d;
  }
  return d;
}

export default function ArchivedOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (session?.user?.isAdmin) fetchArchivedOrders();
  }, [session]);

  const fetchArchivedOrders = async () => {
    try {
      const res = await fetch("/api/admin/archived");
      const data = await res.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      console.error("❌ Failed to fetch archived orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // We pass the Stripe session id to the API (your backend accepts it).
  const restoreOrder = async (sessionId: string) => {
    if (!window.confirm(`♻️ Restore this order?\nID: ${sessionId.slice(-8)}`))
      return;
    try {
      const adminName =
        (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/admin/archived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: sessionId, restore: true, adminName }),
      });
      const result = await res.json();
      if (res.ok) fetchArchivedOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error restoring order:", err);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    return (
      order.archived &&
      ((order.customerName || "").toLowerCase().includes(q) ||
        (order.customerEmail || "").toLowerCase().includes(q) ||
        (order.stripeSessionId || "").toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / Math.max(1, itemsPerPage))
  );
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
        <title>Archived Orders | Classy Diamonds</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>

      <h1 className="text-3xl font-serif font-bold tracking-wide mb-6">
        🛠️ Admin Dashboard
      </h1>

      {/* 🔗 Admin Navigation Tabs */}
      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
        <Link href="/admin" className="hover:text-yellow-300">
          📦 Orders
        </Link>
        <Link href="/admin/completed" className="hover:text-yellow-300">
          ✅ Shipped
        </Link>
        <Link href="/admin/delivered" className="hover:text-yellow-300">
          📬 Delivered
        </Link>
        <Link href="/admin/archived" className="text-yellow-400">
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

      {/* 🔍 Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-6">
        <input
          type="text"
          placeholder="Search archived orders..."
          className="w-full sm:w-1/3 mb-2 sm:mb-0 px-4 py-2 rounded bg-[var(--bg-nav)] text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading archived orders...</p>
      ) : filteredOrders.length === 0 ? (
        <p>No archived orders found.</p>
      ) : (
        <div className="space-y-8">
          {paginatedOrders.map((order) => (
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
              <p className="mb-2 text-sm">📍 {order.customerAddress}</p>
              <p className="mb-4 text-sm">
                🧾 Order Date:{" "}
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleString()
                  : "—"}
              </p>

              <ul className="mb-4 pl-4 list-disc text-sm">
                {(order.items || []).map((item, index) => {
                  const qty = Math.max(1, Math.round(n(item.quantity, 1)));

                  // ✅ prefer unitPrice (new), then sale/discount, then legacy
                  const unit =
                    n(item.unitPrice) ||
                    n(item.salePrice) ||
                    n(item.discountedPrice) ||
                    n(item.originalPrice) ||
                    n(item.price);

                  const base = n(item.originalPrice) || n(item.price) || unit;

                  const orig = base * qty;
                  const sale = unit * qty;

                  const img =
                    item.image && item.image.trim() !== ""
                      ? item.image
                      : "/products/gray-placeholder.jpg";

                  return (
                    <li key={index} className="flex items-center gap-2">
                      <Image
                        src={img}
                        alt={item.name || "Product image"}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                        unoptimized
                      />
                      <span>
                        {item.name || "Item"}
                        {item.size && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white align-middle">
                            Size: {item.size}
                          </span>
                        )}{" "}
                        – x{qty} –{" "}
                        {unit < base ? (
                          <>
                            <span className="line-through mr-1">
                              ${orig.toFixed(2)}
                            </span>
                            <span className="text-green-400">
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
                  💰 Total: ${n(order.amount).toFixed(2)}
                </span>
                <div className="space-x-2">
                  {/* View details/refund page */}
                  <Link href={`/admin/order/${order.stripeSessionId}`}>
                    <span className="bg-blue-500 px-4 py-2 rounded text-sm cursor-pointer">
                      View 🔍
                    </span>
                  </Link>
                  <button
                    onClick={() => restoreOrder(order.stripeSessionId)}
                    className="bg-yellow-600 px-4 py-2 rounded text-sm"
                  >
                    Restore 🗂️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === index + 1
                  ? "bg-blue-600"
                  : "bg-[#2e3a58] hover:bg-blue-500"
              }`}
            >
              {index + 1}
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
    </div>
  );
}
