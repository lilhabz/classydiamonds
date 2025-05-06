// 📂 pages/admin/completed.tsx

import { useEffect, useState } from "react";
import Head from "next/head";

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

  useEffect(() => {
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

    fetchCompletedOrders();
  }, []);

  return (
    <div className="min-h-screen bg-[#1f2a44] text-white p-6">
      <Head>
        <title>Completed Orders | Classy Diamonds</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">✅ Completed Orders</h1>

      {loading ? (
        <p>Loading shipped orders...</p>
      ) : orders.length === 0 ? (
        <p>No completed orders yet.</p>
      ) : (
        <div className="space-y-10">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-[#25304f] rounded-xl p-6 shadow-md"
            >
              <p>
                <strong>Name:</strong> {order.customerName}
              </p>
              <p>
                <strong>Email:</strong> {order.customerEmail}
              </p>
              <p>
                <strong>Address:</strong> {order.customerAddress}
              </p>
              <p>
                <strong>Total:</strong> ${order.amount.toFixed(2)}
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
                        {item.name || "Unnamed"} x{item.quantity || 1} — $
                        {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
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
    </div>
  );
}
