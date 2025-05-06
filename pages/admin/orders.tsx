// ✅ Enhanced pages/admin/orders.tsx with Search Functionality

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
  shipped?: boolean;
}

export default function AdminOrdersPage() {
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
    if (authorized) fetchOrders();
  }, [authorized]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("❌ Failed to fetch orders:", err);
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

  const confirmAndShip = async (orderId: string) => {
    const confirmed = window.confirm(
      `📦 Mark this order as shipped?\nOrder ID: ${orderId}`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/shipped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const result = await res.json();
      if (res.ok) fetchOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error shipping order:", err);
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
        <title>Admin Orders | Classy Diamonds</title>
      </Head>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Orders</h1>
        <Link
          href="/admin/completed"
          className="text-sm bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          View Completed Orders ➡️
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
        <p>Loading orders...</p>
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
            <div className="space-y-8">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-[#25304f] p-6 rounded-xl shadow-md"
                >
                  <h2 className="text-xl font-semibold mb-1">
                    {order.customerName} ({order.customerEmail})
                  </h2>
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
                        {item.quantity}× {item.name} – $
                        {(item.price * item.quantity).toFixed(2)}
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">
                      💰 Total: ${(order.amount / 100).toFixed(2)}
                    </span>
                    <button
                      onClick={() => confirmAndShip(order.stripeSessionId)}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
                    >
                      Mark as Shipped 🚚
                    </button>
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
