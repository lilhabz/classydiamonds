// 📂 pages/admin/archived.tsx – View Archived Orders 🗂

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
  archived?: boolean;
}

export default function ArchivedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const isAdmin = localStorage.getItem("adminAuth") === "true";
    if (isAdmin) setAuthorized(true);
  }, []);

  useEffect(() => {
    if (authorized) fetchOrders();
  }, [authorized]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/completed");
      const data = await res.json();
      const archivedOnly = data.orders.filter((o: Order) => o.archived);
      setOrders(archivedOnly);
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
      const res = await fetch("/api/admin/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, restore: true }),
      });
      const result = await res.json();
      if (res.ok) fetchOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error restoring order:", err);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      order.customerName?.toLowerCase().includes(query) ||
      order.customerEmail?.toLowerCase().includes(query) ||
      order.stripeSessionId?.toLowerCase().includes(query);

    const orderDate = new Date(order.shippedAt || order.createdAt || "");
    const afterStart = startDate ? orderDate >= new Date(startDate) : true;
    const beforeEnd = endDate ? orderDate <= new Date(endDate) : true;

    return matchQuery && afterStart && beforeEnd;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-[#1f2a44] text-white p-6">
      <Head>
        <title>Archived Orders | Classy Diamonds</title>
      </Head>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🗂 Archived Orders</h1>
        <Link
          href="/admin/completed"
          className="text-sm bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          Back to Completed Orders 🔙
        </Link>
      </div>

      {!authorized ? (
        <p>🔒 Admin access required.</p>
      ) : loading ? (
        <p>Loading archived orders...</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-6">
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              className="w-full sm:w-1/3 mb-2 sm:mb-0 px-4 py-2 rounded bg-[#2e3a58] text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 rounded bg-[#2e3a58] text-white"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 rounded bg-[#2e3a58] text-white"
            />
          </div>

          {paginatedOrders.length === 0 ? (
            <p>No archived orders found.</p>
          ) : (
            <div className="space-y-10">
              {paginatedOrders.map((order) => (
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

                  <button
                    onClick={() => restoreOrder(order.stripeSessionId)}
                    className="mt-4 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
                  >
                    Restore ♻️
                  </button>
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
        </>
      )}
    </div>
  );
}
