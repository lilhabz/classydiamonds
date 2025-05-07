// ✅ Enhanced pages/admin/logs.tsx with expandable order view + unified admin nav 🔐📝

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface AdminLog {
  _id: string;
  orderId: string;
  action: "archive" | "restore";
  timestamp: string;
  performedBy: string;
}

interface OrderDetails {
  items: { name: string; quantity: number; price: number }[];
  amount: number;
  customerAddress: string;
  createdAt: string;
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<
    Record<string, OrderDetails>
  >({});

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
      if (res.ok && data.order) {
        setExpandedOrders((prev) => ({ ...prev, [orderId]: data.order }));
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

  if (status === "loading")
    return <div className="p-6">Checking access...</div>;
  if (!session?.user?.isAdmin)
    return (
      <div className="p-6 text-red-300 font-semibold">
        ❌ Unauthorized – Admins only
      </div>
    );

  return (
    <div className="min-h-screen bg-[#1f2a44] text-white p-6">
      <Head>
        <title>Admin Logs | Classy Diamonds</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">🛠️ Admin Dashboard</h1>

      {/* 🔗 Admin Navigation Tabs */}
      <nav className="flex space-x-6 mb-8 border-b border-[#2a374f] pb-4 text-white text-sm font-semibold">
        <Link href="/admin" className="hover:text-yellow-300">
          📦 Orders
        </Link>
        <Link href="/admin/completed" className="hover:text-yellow-300">
          ✅ Shipped
        </Link>
        <Link href="/admin/archived" className="hover:text-yellow-300">
          🗂 Archived
        </Link>
        <Link href="/admin/logs" className="text-yellow-400">
          📝 Logs
        </Link>
      </nav>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">🧾 Admin Logs</h2>
        <button
          onClick={downloadCSV}
          className="text-sm bg-green-600 px-4 py-2 rounded hover:bg-green-700"
        >
          Export CSV 📄
        </button>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p>No admin activity logged yet.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[#2e3a58]">
              <tr>
                <th className="py-2 px-4">🆔 Order ID</th>
                <th className="py-2 px-4">Action</th>
                <th className="py-2 px-4">Time</th>
                <th className="py-2 px-4">Admin</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log._id}
                    className="border-b border-[#384968] cursor-pointer"
                    onClick={() => fetchOrderDetails(log.orderId)}
                  >
                    <td className="py-2 px-4 text-blue-300 hover:text-blue-400">
                      {log.orderId.slice(-8)}
                    </td>
                    <td className="py-2 px-4 capitalize text-yellow-300">
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
