// 📂 pages/admin/logs.tsx – View Admin Action Logs 📝 with CSV Export

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

interface AdminLog {
  _id: string;
  orderId: string;
  action: "archive" | "restore";
  timestamp: string;
  performedBy: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem("adminAuth") === "true";
    if (isAdmin) setAuthorized(true);
  }, []);

  useEffect(() => {
    if (authorized) fetchLogs();
  }, [authorized]);

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

  return (
    <div className="min-h-screen bg-[#1f2a44] text-white p-6">
      <Head>
        <title>Admin Logs | Classy Diamonds</title>
      </Head>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📝 Admin Logs</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={downloadCSV}
            className="text-sm bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV 📄
          </button>
          <Link
            href="/admin/orders"
            className="text-sm bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Orders 🔙
          </Link>
        </div>
      </div>

      {!authorized ? (
        <p>🔒 Admin access required.</p>
      ) : loading ? (
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
                <tr key={log._id} className="border-b border-[#384968]">
                  <td className="py-2 px-4">{log.orderId}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
