// ✅ Enhanced pages/admin/completed.tsx with fixed total, archive logic, and unified dashboard nav 🔐🛠️

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items?: { name: string; quantity: number; price: number }[];
  amount: number;
  createdAt: string;
  stripeSessionId: string;
  orderNumber?: number;
  shippedAt?: string;
  trackingNumber?: string;
  carrier?: string;
  delivered?: boolean;
  deliveredAt?: string;
  archived?: boolean;
}

export default function CompletedOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [trackingInputs, setTrackingInputs] = useState<
    Record<string, { trackingNumber: string; carrier: string }>
  >({});
  const itemsPerPage = 5;

  useEffect(() => {
    if (session?.user?.isAdmin) fetchCompletedOrders();
  }, [session]);

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

  const markDelivered = async (orderId: string) => {
    const confirmed = window.confirm(
      `📬 Mark this order as delivered?\nOrder ID: ${orderId}`
    );
    if (!confirmed) return;

    try {
      const adminName =
        session?.user?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, adminName }),
      });
      const result = await res.json();
      if (res.ok) fetchCompletedOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error marking delivered:", err);
    }
  };

  const updateTracking = async (orderId: string) => {
    const input = trackingInputs[orderId];
    if (!input?.trackingNumber) {
      alert("❌ Please enter a tracking number.");
      return;
    }

    try {
      const adminName =
        session?.user?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          trackingNumber: input.trackingNumber,
          carrier: input.carrier,
          adminName,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        fetchCompletedOrders();
      } else {
        alert("❌ " + result.error);
      }
    } catch (err) {
      console.error("❌ Error updating tracking:", err);
    }
  };

  const archiveOrder = async (orderId: string) => {
    const confirmed = window.confirm(
      `🗂 Archive this order?\nOrder ID: ${orderId}`
    );
    if (!confirmed) return;

    try {
      const adminName =
        session?.user?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/admin/archived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, adminName }),
      });
      const result = await res.json();
      if (res.ok) fetchCompletedOrders();
      else alert("❌ " + result.error);
    } catch (err) {
      console.error("❌ Error archiving order:", err);
    }
  };

  const downloadCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Order ID",
      "Total",
      "Shipped At",
      "Items",
    ];
    const rows = orders.map((order) => [
      order.customerName,
      order.customerEmail,
      order.stripeSessionId,
      `$${order.amount.toFixed(2)}`,
      new Date(order.shippedAt || "").toLocaleString(),
      (order.items || [])
        .map(
          (i) =>
            `${i.quantity}× ${i.name} - $${(i.quantity * i.price).toFixed(2)}`
        )
        .join(" | "),
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "completed_orders.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    const content = document.getElementById("print-area")?.innerHTML;
    const win = window.open("", "", "width=800,height=600");
    if (win && content) {
      win.document.write(`<html><body>${content}</body></html>`);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (order.archived || order.delivered) return false;

    const query = searchQuery.toLowerCase();
    const matchQuery =
      order.customerName?.toLowerCase().includes(query) ||
      order.customerEmail?.toLowerCase().includes(query) ||
      order.stripeSessionId?.toLowerCase().includes(query);

    const orderDate = new Date(order.shippedAt || "");
    const afterStart = startDate ? orderDate >= new Date(startDate) : true;
    const beforeEnd = endDate ? orderDate <= new Date(endDate) : true;

    return matchQuery && afterStart && beforeEnd;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
        <title>Completed Orders | Classy Diamonds</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>

      {/* 🛠️ Admin Dashboard Heading */}
      <h1 className="text-3xl font-bold mb-6">🛠️ Admin Dashboard</h1>

      {/* 🔗 Admin Navigation Tabs */}
      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
        <Link href="/admin" className="hover:text-yellow-300">
          📦 Orders
        </Link>
        <Link href="/admin/completed" className="text-yellow-400">
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
        <Link href="/admin/custom-photos" className="hover:text-yellow-300">
          🖼 Custom
        </Link>
        <Link href="/admin/logs" className="hover:text-yellow-300">
          📝 Logs
        </Link>
      </nav>

      {loading ? (
        <p>Loading shipped orders...</p>
      ) : paginatedOrders.length === 0 ? (
        <p>No matching orders found.</p>
      ) : (
        <>
          {/* 🔍 Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-6">
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              className="w-full sm:w-1/3 mb-2 sm:mb-0 px-4 py-2 rounded bg-[var(--bg-nav)] text-white"
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
            <button
              onClick={downloadCSV}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
            >
              Export CSV 📄
            </button>
            <button
              onClick={printPDF}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
            >
              Print PDF 🖨️
            </button>
          </div>

          {/* 🧾 Orders */}
          <div id="print-area" className="space-y-10">
            {paginatedOrders.map((order) => (
              <div
                key={order._id}
                className="bg-[var(--bg-nav)] rounded-xl p-6 shadow-md"
              >
                <h2 className="text-xl font-semibold mb-1">
                  {order.customerName} ({order.customerEmail})
                </h2>
                <p className="text-sm mb-2 text-gray-300">
                  🔢 Order #: {order.orderNumber ?? "N/A"}
                </p>
                <p className="text-sm mb-2 text-gray-300">
                  🆔 Order ID: {order.stripeSessionId.slice(-8)}
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
                {order.trackingNumber ? (
                  <p>
                    <strong>Tracking:</strong> {order.trackingNumber}
                    {order.carrier ? ` (${order.carrier})` : ""}
                  </p>
                ) : (
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      value={
                        trackingInputs[order.stripeSessionId]?.carrier || "USPS"
                      }
                      onChange={(e) =>
                        setTrackingInputs((prev) => ({
                          ...prev,
                          [order.stripeSessionId]: {
                            ...(prev[order.stripeSessionId] || { trackingNumber: "", carrier: "USPS" }),
                            carrier: e.target.value,
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-[#2e3a58] text-white"
                    >
                      <option value="USPS">USPS</option>
                      <option value="UPS">UPS</option>
                      <option value="FedEx">FedEx</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Tracking #"
                      value={
                        trackingInputs[order.stripeSessionId]?.trackingNumber || ""
                      }
                      onChange={(e) =>
                        setTrackingInputs((prev) => ({
                          ...prev,
                          [order.stripeSessionId]: {
                            ...(prev[order.stripeSessionId] || { trackingNumber: "", carrier: "USPS" }),
                            trackingNumber: e.target.value,
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-[#2e3a58] text-white flex-1"
                    />
                    <button
                      onClick={() => updateTracking(order.stripeSessionId)}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                    >
                      Save Tracking
                    </button>
                  </div>
                )}
                <div className="mt-4">
                  <strong>Items:</strong>
                  {Array.isArray(order.items) && order.items.length > 0 ? (
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

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => markDelivered(order.stripeSessionId)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                  >
                    Delivered 📬
                  </button>
                  <button
                    onClick={() => archiveOrder(order.stripeSessionId)}
                    className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-sm"
                  >
                    Archive 🗂
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 🔄 Pagination */}
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

          {/* 🚪 Exit */}
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-8 text-sm text-red-300 underline"
          >
            Exit Admin Panel 🔒
          </button>
        </>
      )}
    </div>
  );
}
