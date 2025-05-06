// 📂 pages/admin/orders.tsx – Admin View of Unshipped Orders 🧾🔒

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

// 💎 Order type definition
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
  const [message, setMessage] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [authorized, setAuthorized] = useState(false);

  // 🔐 Only fetch orders if authorized
  useEffect(() => {
    if (authorized) fetchOrders();
  }, [authorized]);

  // 📦 Fetch unshipped orders from API
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

  // 🔐 Password-protected entry
  const handleLogin = () => {
    if (adminKey === process.env.NEXT_PUBLIC_ADMIN_KEY) {
      setAuthorized(true);
    } else {
      alert("❌ Incorrect admin key");
    }
  };

  // 🚚 Confirmation and ship request
  const confirmAndShip = async (orderId: string) => {
    const confirmed = window.confirm(
      `📦 Are you sure you want to mark this order as shipped?\n\nOrder ID:\n${orderId}`
    );

    if (!confirmed) return;

    try {
      const res = await fetch("/api/shipped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const result = await res.json();

      if (res.ok) {
        setMessage("✅ Order marked as shipped!");
        // Refresh order list
        fetchOrders();
      } else {
        alert("❌ " + result.error);
      }
    } catch (err) {
      console.error("❌ Error shipping order:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#1f2a44] text-white p-6">
      <Head>
        <title>Admin Orders | Classy Diamonds</title>
      </Head>

      {/* 🧭 Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Orders</h1>
        <Link
          href="/admin/completed"
          className="text-sm bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          View Completed Orders ➡️
        </Link>
      </div>

      {/* 🔐 Admin Login Prompt */}
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
      ) : (
        <>
          {/* 🔄 Orders Table */}
          {loading ? (
            <p>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p>No unshipped orders found ✅</p>
          ) : (
            <div className="space-y-8">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-[#25304f] p-6 rounded-xl shadow-md"
                >
                  <h2 className="text-xl font-semibold mb-2">
                    {order.customerName} ({order.customerEmail})
                  </h2>
                  <p className="mb-2 text-sm">📍 {order.customerAddress}</p>
                  <p className="mb-2 text-sm">
                    🧾 Order Date: {new Date(order.createdAt).toLocaleString()}
                  </p>

                  {/* 🛍️ Items List */}
                  <ul className="mb-4 pl-4 list-disc text-sm">
                    {order.items?.map((item, index) => (
                      <li key={index}>
                        {item.quantity}× {item.name} – $
                        {(item.price * item.quantity).toFixed(2)}
                      </li>
                    ))}
                  </ul>

                  {/* 💵 Amount + Button */}
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
        </>
      )}
    </div>
  );
}
