// ✅ pages/admin/delivered.tsx – view delivered orders (size-aware, no CSV/PDF) 🔐📬

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface OrderItem {
  name: string;
  quantity?: number;
  price?: number;
  discountedPrice?: number;
  salePrice?: number;
  originalPrice?: number;
  image?: string;
  size?: string;
}

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items?: OrderItem[];
  amount: number;
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

export default function DeliveredOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (session?.user?.isAdmin) fetchDeliveredOrders();
  }, [session]);

  const fetchDeliveredOrders = async () => {
    try {
      const res = await fetch("/api/admin/delivered");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("❌ Failed to fetch delivered orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const archiveOrder = async (orderId: string) => {
    const confirmed = window.confirm(
      `🗂 Archive this order?\nOrder ID: ${orderId}`
    );
    if (!confirmed) return;

    try {
      const adminName =
        (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/admin/archived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, adminName }),
      });
      const result = await res.json();
      if (res.ok) fetchDeliveredOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error archiving order:", err);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (order.archived) return false;

    const query = searchQuery.toLowerCase();
    const matchQuery =
      order.customerName?.toLowerCase().includes(query) ||
      order.customerEmail?.toLowerCase().includes(query) ||
      order.stripeSessionId?.toLowerCase().includes(query);

    const orderDate = new Date(order.deliveredAt || "");
    const afterStart = startDate ? orderDate >= new Date(startDate) : true;
    const beforeEnd = endDate ? orderDate <= new Date(endDate) : true;

    return matchQuery && afterStart && beforeEnd;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
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
        <title>Delivered Orders | Classy Diamonds</title>
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
        <Link href="/admin/completed" className="hover:text-yellow-300">
          ✅ Shipped
        </Link>
        <Link href="/admin/delivered" className="text-yellow-400">
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
        <p>Loading delivered orders...</p>
      ) : paginatedOrders.length === 0 ? (
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
                <p className="mb-2">📍 {order.customerAddress}</p>
                <p className="mb-4">
                  🧾 Delivered:{" "}
                  {new Date(order.deliveredAt || "").toLocaleString()}
                </p>
                {order.trackingNumber && (
                  <p>
                    <strong>Tracking:</strong> {order.trackingNumber}
                    {order.carrier ? ` (${order.carrier})` : ""}
                  </p>
                )}
                <div className="mt-4">
                  <strong>Items:</strong>
                  {Array.isArray(order.items) && order.items.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {order.items.map((item, i) => {
                        const qty = item.quantity ?? 1;
                        const displayPrice =
                          item.salePrice ??
                          item.discountedPrice ??
                          item.originalPrice ??
                          item.price ??
                          0;
                        const basePrice =
                          item.originalPrice ?? item.price ?? displayPrice;
                        const orig = basePrice * qty;
                        const sale = displayPrice * qty;
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
                            <span>
                              {item.name || "Unnamed"}
                              {item.size && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white align-middle">
                                  Size: {item.size}
                                </span>
                              )}{" "}
                              – x{qty} –{" "}
                              {displayPrice < basePrice ? (
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
                  ) : (
                    <p className="text-sm text-red-300 mt-2">
                      ⚠️ No item data available.
                    </p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-lg font-semibold">
                    💰 Total: ${order.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => archiveOrder(order.stripeSessionId)}
                    className="bg-yellow-600 px-4 py-2 rounded text-sm"
                  >
                    Archive 🗂
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 🔄 Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              {[...Array(totalPages)].map((_, index) => (
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

          {/* 🚪 Exit */}
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
    </div>
  );
}
