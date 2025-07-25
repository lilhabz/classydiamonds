// ✅ pages/admin/index.tsx – Admin Orders with Original & Sale Prices 🔐🛠️

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
  shipping_address_string?: string;
  items?: {
    name: string;
    quantity: number;
    originalPrice: number; // ← your “before” price
    salePrice?: number; // ← your “after” price if discounted
  }[];
  amount: number;
  createdAt: string;
  stripeSessionId: string;
  orderNumber?: number;
  shipped?: boolean;
  archived?: boolean;
}

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (session?.user?.isAdmin) fetchOrders();
  }, [session]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("❌ Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmAndShip = async (orderId: string) => {
    if (!window.confirm(`📦 Mark this order as shipped?\nOrder ID: ${orderId}`))
      return;
    try {
      const adminName =
        session?.user?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/shipped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, adminName }),
      });
      if (res.ok) fetchOrders();
      else {
        const result = await res.json();
        alert("❌ " + result.error);
      }
    } catch (err) {
      console.error("❌ Error shipping order:", err);
    }
  };

  const archiveOrder = async (orderId: string) => {
    if (!window.confirm(`📦 Archive this order?\nOrder ID: ${orderId}`)) return;
    try {
      const adminName =
        session?.user?.firstName || session?.user?.name?.split(" ")[0];
      const res = await fetch("/api/admin/archived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, adminName }),
      });
      if (res.ok) fetchOrders();
      else {
        const result = await res.json();
        alert("❌ " + result.error);
      }
    } catch (err) {
      console.error("❌ Error archiving order:", err);
    }
  };

  const downloadCSV = () => {
    const headers = ["Name", "Email", "Order ID", "Total", "Date", "Items"];
    const rows = orders.map((order) => [
      order.customerName,
      order.customerEmail,
      order.stripeSessionId,
      `$${order.amount.toFixed(2)}`,
      new Date(order.createdAt).toLocaleString(),
      (order.items || [])
        .map((i) => {
          const unit = i.salePrice ?? i.originalPrice;
          return `${i.quantity}× ${i.name} - $${(unit * i.quantity).toFixed(
            2
          )}`;
        })
        .join(" | "),
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unshipped_orders.csv";
    a.click();
    URL.revokeObjectURL(url);
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
    if (order.archived || order.shipped) return false;
    const q = searchQuery.toLowerCase();
    const matchQ =
      order.customerName.toLowerCase().includes(q) ||
      order.customerEmail.toLowerCase().includes(q) ||
      order.stripeSessionId.toLowerCase().includes(q);
    const d = new Date(order.createdAt);
    const after = startDate ? d >= new Date(startDate) : true;
    const before = endDate ? d <= new Date(endDate) : true;
    return matchQ && after && before;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginated = filteredOrders.slice(
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
        <title>Admin Orders | Classy Diamonds</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>

      <h1 className="text-3xl font-serif font-bold tracking-wide mb-6">
        🛠️ Admin Dashboard
      </h1>

      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-sm font-semibold">
        <Link href="/admin" className="text-yellow-400">
          📦 Orders
        </Link>
        <Link href="/admin/completed" className="hover:text-yellow-300">
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

      {/* Filters & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          className="w-full sm:w-1/3 px-4 py-2 rounded bg-[var(--bg-nav)] text-white mb-2 sm:mb-0"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input
          type="date"
          className="px-2 py-1 rounded bg-[#2e3a58] text-white"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="px-2 py-1 rounded bg-[#2e3a58] text-white"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
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

      {/* Orders List */}
      <div id="print-area" className="space-y-8">
        {paginated.map((order) => (
          <div
            key={order._id}
            className="bg-[var(--bg-nav)] p-6 rounded-xl shadow-md transition-all"
          >
            <h2 className="text-xl font-semibold mb-1">
              {order.customerName} ({order.customerEmail})
            </h2>
            <p className="text-sm text-gray-300 mb-2">
              🔢 Order #: {order.orderNumber ?? "N/A"}
            </p>
            <p className="text-sm text-gray-300 mb-2">
              🆔 Order ID: {order.stripeSessionId.slice(-8)}
            </p>
            <p className="text-sm mb-2">
              📍 {order.shipping_address_string || order.customerAddress}
            </p>
            <p className="text-sm mb-4">
              🧾 Date: {new Date(order.createdAt).toLocaleString()}
            </p>

            <ul className="mb-4 pl-4 list-disc text-sm">
              {order.items?.map((it, idx) => {
                const orig = it.originalPrice * it.quantity;
                const sale = (it.salePrice ?? it.originalPrice) * it.quantity;
                return (
                  <li key={idx}>
                    {it.quantity}× {it.name} –{" "}
                    {it.salePrice !== undefined ? (
                      <>
                        <span className="line-through text-gray-400 mr-2">
                          ${orig.toFixed(2)}
                        </span>
                        <span className="text-red-400 font-semibold">
                          ${sale.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span>${orig.toFixed(2)}</span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                💰 Total: ${order.amount.toFixed(2)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmAndShip(order.stripeSessionId)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
                >
                  Mark as Shipped 🚚
                </button>
                <button
                  onClick={() => archiveOrder(order.stripeSessionId)}
                  className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-sm"
                >
                  Archive 🗂
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === idx + 1
                  ? "bg-blue-600"
                  : "bg-[var(--bg-nav)] hover:bg-blue-500"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => (window.location.href = "/")}
        className="mt-8 text-sm text-red-300 underline"
      >
        Exit Admin Panel 🔒
      </button>
    </div>
  );
}
