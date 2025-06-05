// ✅ Full pages/admin/logs.tsx – with expandable order view, shipped logs support, search, and admin nav 🔐📝

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface AdminLog {
  _id: string;
  orderId: string;
  action: "archive" | "restore" | "shipped" | "delivered";
  timestamp: string;
  performedBy: string;
}

interface OrderDetails {
  items: { name: string; quantity: number; price: number }[];
  amount: number;
  customerAddress: string;
  createdAt: string;
  orderNumber?: number;
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<
    Record<string, OrderDetails>
  >({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (session?.user?.isAdmin) fetchLogs();
  }, [session]);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("❌ Failed to fetch admin logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    if (expandedOrders[orderId]) {
      const updated = { ...expandedOrders };
      delete updated[orderId];
      setExpandedOrders(updated);
      return;
    }

    try {
      const res = await fetch(`/api/admin/order?orderId=${orderId}`);
      const data = await res.json();
      if (res.ok) {
        setExpandedOrders((prev) => ({ ...prev, [orderId]: data }));
      }
    } catch (err) {
      console.error("❌ Failed to fetch order details:", err);
    }
  };

  const downloadCSV = () => {
    const headers = ["Order ID", "Action", "Timestamp", "Admin"];
    const rows = logs.map((log) => [
      log.orderId,
      log.action,
      new Date(log.timestamp).toLocaleString(),
      log.performedBy,
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin_logs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchQuery.toLowerCase())
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
        <title>Admin Logs | Classy Diamonds</title>
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
        <Link href="/admin/archived" className="hover:text-yellow-300">
          🗂 Archived
        </Link>
        <Link href="/admin/products" className="hover:text-yellow-300">
          🛠 Products
        </Link>
        <Link href="/admin/logs" className="text-yellow-400">
          📝 Logs
        </Link>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <input
          type="text"
          placeholder="Search by Order ID or Admin..."
          className="w-full sm:w-1/3 px-4 py-2 rounded bg-[var(--bg-nav)] text-[var(--foreground)]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={downloadCSV}
          className="text-sm bg-green-600 px-4 py-2 rounded hover:bg-green-700"
        >
          Export CSV 📄
        </button>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : filteredLogs.length === 0 ? (
        <p>No matching admin logs found.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[var(--bg-nav)]">
              <tr>
                <th className="py-2 px-4">🆔 Order ID</th>
                <th className="py-2 px-4">Action</th>
                <th className="py-2 px-4">Time</th>
                <th className="py-2 px-4">Admin</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <>
                  <tr
                    key={log._id}
                    className="border-b border-[var(--bg-nav)] cursor-pointer"
                    onClick={() => fetchOrderDetails(log.orderId)}
                  >
                    <td className="py-2 px-4 text-blue-300 hover:text-blue-400">
                      {log.orderId.slice(-8)}
                    </td>
                    <td
                      className={`py-2 px-4 capitalize ${
                        log.action === "shipped"
                          ? "text-green-400"
                          : log.action === "delivered"
                          ? "text-purple-400"
                          : log.action === "restore"
                          ? "text-blue-400"
                          : "text-yellow-300"
                      }`}
                    >
                      {log.action}
                    </td>

                    <td className="py-2 px-4 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-400">
                      {log.performedBy}
                    </td>
                  </tr>
                  {expandedOrders[log.orderId] && (
                    <tr className="bg-[#2a374f]">
                      <td colSpan={4} className="px-6 py-4">
                        <p className="mb-2 text-sm">
                          🔢 Order #: {expandedOrders[log.orderId].orderNumber ?? "N/A"}
                        </p>
                        <p className="mb-2 text-sm">
                          📍 Address:{" "}
                          {expandedOrders[log.orderId].customerAddress}
                        </p>
                        <p className="mb-2 text-sm">
                          🧾 Order Date:{" "}
                          {new Date(
                            expandedOrders[log.orderId].createdAt
                          ).toLocaleString()}
                        </p>
                        <ul className="pl-4 list-disc text-sm mb-2">
                          {expandedOrders[log.orderId].items.map((item, i) => (
                            <li key={i}>
                              {item.quantity}× {item.name} – ${" "}
                              {(item.quantity * item.price).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                        <p className="font-semibold">
                          💰 Total: $
                          {expandedOrders[log.orderId].amount.toFixed(2)}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
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
