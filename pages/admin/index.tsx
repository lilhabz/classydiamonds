// 📂 pages/admin/index.tsx – Central Admin Dashboard 🛠️

import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem("adminAuth") === "true";
    if (isAdmin) setAuthorized(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#1f2a44] text-white p-6">
      <Head>
        <title>Admin Dashboard | Classy Diamonds</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">🛠️ Admin Dashboard</h1>

      {!authorized ? (
        <p className="text-red-400">🔒 Admin access required.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <Link
            href="/admin/orders"
            className="block bg-[#25304f] hover:bg-[#304064] p-6 rounded-xl shadow-md"
          >
            <h2 className="text-xl font-semibold mb-2">📦 Unshipped Orders</h2>
            <p className="text-sm text-gray-300">
              Manage all pending customer orders
            </p>
          </Link>

          <Link
            href="/admin/completed"
            className="block bg-[#25304f] hover:bg-[#304064] p-6 rounded-xl shadow-md"
          >
            <h2 className="text-xl font-semibold mb-2">✅ Completed Orders</h2>
            <p className="text-sm text-gray-300">
              View and archive shipped orders
            </p>
          </Link>

          <Link
            href="/admin/archived"
            className="block bg-[#25304f] hover:bg-[#304064] p-6 rounded-xl shadow-md"
          >
            <h2 className="text-xl font-semibold mb-2">🗂 Archived Orders</h2>
            <p className="text-sm text-gray-300">
              Restore previously hidden orders
            </p>
          </Link>

          <Link
            href="/admin/logs"
            className="block bg-[#25304f] hover:bg-[#304064] p-6 rounded-xl shadow-md"
          >
            <h2 className="text-xl font-semibold mb-2">📝 Admin Logs</h2>
            <p className="text-sm text-gray-300">
              Audit trail of archive/restore actions
            </p>
          </Link>
        </div>
      )}
    </div>
  );
}
