// ✅ Enhanced pages/admin/completed.tsx with Search Functionality

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items?: { name: string; quantity: number; price: number }[];
  amount: number;
  createdAt: string;
  stripeSessionId: string;
  shippedAt?: string;
}

export default function CompletedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const isAdmin = localStorage.getItem("adminAuth") === "true";
    if (isAdmin) setAuthorized(true);
  }, []);

  useEffect(() => {
    if (authorized) fetchCompletedOrders();
  }, [authorized]);

  const fetchCompletedOrders = async () => {
    try {
      const res = await fetch("/api/admin/completed");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("❌ Failed to fetch completed orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (adminKey === process.env.NEXT_PUBLIC_ADMIN_KEY) {
      localStorage.setItem("adminAuth", "true");
      setAuthorized(true);
    } else {
      alert("❌ Incorrect admin key");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      order.customerName?.toLowerCase().includes(query) ||
      order.customerEmail?.toLowerCase().includes(query) ||
      order.stripeSessionId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#1f2a44] text-white p-6">
      <Head>
        <title>Completed Orders | Classy Diamonds</title>
      </Head>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">✅ Completed Orders</h1>
        <Link
          href="/admin/orders"
          className="text-sm bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          View Unshipped Orders 🔙
        </Link>
      </div>

      {!authorized ? (
        <div className="max-w-sm mx-auto mt-20">
          <input
            type="password"
            placeholder="Enter admin password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="w-full px-4 py-2 rounded bg-gray-100 text-black mb-4"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Login 🔑
          </button>
        </div>
      ) : loading ? (
        <p>Loading shipped orders...</p>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            className="w-full max-w-md mb-6 px-4 py-2 rounded bg-[#2e3a58] text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {filteredOrders.length === 0 ? (
            <p>No matching orders found.</p>
          ) : (
            <div className="space-y-10">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-[#25304f] rounded-xl p-6 shadow-md"
                >
                  <h2 className="text-xl font-semibold mb-1">
                    {order.customerName} ({order.customerEmail})
                  </h2>
                  <p className="text-sm mb-2 text-gray-300">
                    🆔 Order ID: {order.stripeSessionId.slice(-8)}
                  </p>
                  <p>
                    <strong>Address:</strong> {order.customerAddress}
                  </p>
                  <p>
                    <strong>Total:</strong> ${(order.amount / 100).toFixed(2)}
                  </p>
                  <p>
                    <strong>Shipped At:</strong>{" "}
                    {new Date(order.shippedAt || "").toLocaleString()}
                  </p>

                  <div className="mt-4">
                    <strong>Items:</strong>
                    {Array.isArray(order.items) ? (
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {order.items.map((item, i) => (
                          <li key={i}>
                            {item.name || "Unnamed"} × {item.quantity || 1} — $
                            {((item.price || 0) * (item.quantity || 1)).toFixed(
                              2
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-red-300 mt-2">
                        ⚠️ No item data available.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              localStorage.removeItem("adminAuth");
              window.location.reload();
            }}
            className="mt-8 text-sm text-red-300 underline"
          >
            Logout 🔒
          </button>
        </>
      )}
    </div>
  );
}
