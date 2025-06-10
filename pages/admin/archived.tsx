// ✅ Enhanced pages/admin/archived.tsx with Restore button, unified nav, pagination, and logging 🔐🗂️

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items?: { name: string; quantity: number; price: number }[];
  amount: number;
  createdAt: string;
  stripeSessionId: string;
  orderNumber?: number;
  shippedAt?: string;
  archived?: boolean;
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
      setOrders(data.orders || []);
    } catch (err) {
      console.error("❌ Failed to fetch archived orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const restoreOrder = async (orderId: string) => {
    const confirmed = window.confirm(
      `♻️ Restore this order?\nOrder ID: ${orderId}`
    );
    if (!confirmed) return;

    try {
      const adminName =
        session?.user?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/admin/archived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        


        body: JSON.stringify({ orderId, restore: true, adminName }),


      });
      const result = await res.json();
      if (res.ok) fetchArchivedOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error restoring order:", err);
    }
  };

  const downloadCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Order ID",
      "Total",
      "Archived At",
      "Items",
    ];
    const rows = orders.map((order) => [
      order.customerName,
      order.customerEmail,
      order.stripeSessionId,
      `$${order.amount.toFixed(2)}`,
      new Date(order.createdAt || "").toLocaleString(),
      (order.items || [])
        .map(
          (i) =>
            `${i.quantity}× ${i.name} - $${(i.quantity * i.price).toFixed(2)}`
        )
        .join(" | "),
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "archived_orders.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      order.archived &&
      (order.customerName?.toLowerCase().includes(query) ||
        order.customerEmail?.toLowerCase().includes(query) ||
        order.stripeSessionId?.toLowerCase().includes(query))
    );
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
        <title>Archived Orders | Classy Diamonds</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>

      <h1 className="text-3xl font-bold mb-6">🛠️ Admin Dashboard</h1>

      {/* 🔗 Admin Navigation Tabs */}
      <nav className="flex space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-6">
        <input
          type="text"
          placeholder="Search archived orders..."
          className="w-full sm:w-1/3 mb-2 sm:mb-0 px-4 py-2 rounded bg-[var(--bg-nav)] text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={downloadCSV}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
        >
          Export CSV 📄
        </button>
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
              className="bg-[var(--bg-nav)] p-6 rounded-xl shadow-md"
            >
              <h2 className="text-xl font-semibold mb-1">
                {order.customerName} ({order.customerEmail})
              </h2>
              <p className="text-sm mb-2 text-gray-300">
                🔢 Order #: {order.orderNumber ?? "N/A"}
              </p>
              <p className="text-sm mb-2 text-gray-300">
                🆔 Order ID: {order.stripeSessionId.slice(-8)}
              </p>
              <p className="mb-2 text-sm">📍 {order.customerAddress}</p>
              <p className="mb-2 text-sm">
                🧾 Order Date: {new Date(order.createdAt).toLocaleString()}
              </p>
              <ul className="mb-4 pl-4 list-disc text-sm">
                {order.items?.map((item, index) => (
                  <li key={index}>
                    {item.quantity}× {item.name} – ${" "}
                    {(item.price * item.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">
                  💰 Total: ${order.amount.toFixed(2)}
                </span>
                <button
                  onClick={() => restoreOrder(order.stripeSessionId)}
                  className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-sm"
                >
                  Restore 🗂️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
