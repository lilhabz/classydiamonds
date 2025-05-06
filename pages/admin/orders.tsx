// 📂 pages/admin/orders.tsx

import { useEffect, useState } from "react";
import Head from "next/head";

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: { name: string; quantity: number; price: number; image?: string }[];
  amount: number;
  createdAt: string;
  stripeSessionId: string;
  shipped?: boolean;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
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

    fetchOrders();
  }, []);

  const markAsShipped = async (orderId: string) => {
    setMessage("Sending shipping email...");
    try {
      const res = await fetch("/api/shipped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage("✅ Shipping email sent.");
      } else {
        setMessage(`❌ Failed to send: ${result.error}`);
      }
    } catch (err) {
      setMessage("❌ Error sending shipping email.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#1f2a44] text-white p-6">
      <Head>
        <title>Admin Orders | Classy Diamonds</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">📦 Admin Order Management</h1>

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
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
                <strong>Order Total:</strong> ${order.amount.toFixed(2)}
              </p>
              <p>
                <strong>Order Date:</strong>{" "}
                {new Date(order.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Order ID:</strong> {order.stripeSessionId}
              </p>

              <div className="mt-4">
                <strong>Items:</strong>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {order.items.map((item, i) => (
                    <li key={i}>
                      {item.name} x{item.quantity} — $
                      {(item.price * item.quantity).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => markAsShipped(order.stripeSessionId)}
                className="mt-6 px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
              >
                📬 Mark as Shipped
              </button>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p className="mt-8 text-center text-yellow-300 font-semibold">
          {message}
        </p>
      )}
    </div>
  );
}
