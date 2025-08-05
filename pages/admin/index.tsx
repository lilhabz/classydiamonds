// ✅ pages/admin/index.tsx – Admin Orders with Safe Image Fallback 🔐🛠️

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  discountedPrice?: number;
  salePrice?: number;
  originalPrice?: number;
  image?: string;
}

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  shipping_address?: {
    street?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  shipping_address_string: string;
  addressSource?: "Stripe" | "Account" | "Unknown";
  items: OrderItem[];
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

  // 📦 Fetch orders after admin session confirmed
  useEffect(() => {
    if (session?.user?.isAdmin) fetchOrders();
  }, [session]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json: { orders: Order[]; error?: string } = await res.json();
      setOrders(json.orders || []);
    } catch (err) {
      console.error("❌ Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }

  // 🚚 Mark as shipped
  async function confirmAndShip(orderId: string) {
    if (!confirm(`📦 Mark order ${orderId} as shipped?`)) return;
    const adminName =
      (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
    const res = await fetch("/api/shipped", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, adminName }),
    });
    if (res.ok) fetchOrders();
    else {
      const { error } = await res.json();
      alert("❌ " + error);
    }
  }

  // 🗂 Archive order
  async function archiveOrder(orderId: string) {
    if (!confirm(`🗂 Archive order ${orderId}?`)) return;
    const adminName =
      (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
    const res = await fetch("/api/admin/archived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, adminName }),
    });
    if (res.ok) fetchOrders();
    else {
      const { error } = await res.json();
      alert("❌ " + error);
    }
  }

  // 📤 Export CSV
  function downloadCSV() {
    const headers = [
      "Name",
      "Email",
      "Order ID",
      "Shipping Address",
      "Address Source",
      "Total",
      "Date",
      "Items",
    ];
    const rows = orders.map((o) => [
      o.customerName,
      o.customerEmail,
      o.stripeSessionId,
      o.shipping_address
        ? `${o.shipping_address.street}${
            o.shipping_address.line2 ? `, ${o.shipping_address.line2}` : ""
          }, ${o.shipping_address.city}, ${o.shipping_address.state} ${
            o.shipping_address.zip
          }, ${o.shipping_address.country}`
        : o.shipping_address_string,
      o.addressSource || "Unknown",
      `$${o.amount.toFixed(2)}`,
      new Date(o.createdAt).toLocaleString(),
      o.items
        .map((i) => {
          const unit = i.discountedPrice ?? i.price ?? 0;
          return `${i.quantity}× ${i.name} – $${(
            unit * (i.quantity ?? 1)
          ).toFixed(2)}`;
        })
        .join(" | "),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPDF() {
    const ordersArea = document.getElementById("print-area");
    if (!ordersArea) return;

    // Build a clean text-only version
    const textOrders = Array.from(
      ordersArea.querySelectorAll(".bg-[var(--bg-nav)]")
    )
      .map((orderDiv) => {
        const name = orderDiv.querySelector("h2")?.textContent?.trim() || "";
        const orderId = orderDiv.querySelector("p")?.textContent?.trim() || "";
        const address =
          Array.from(orderDiv.querySelectorAll("p"))
            .map((p) => p.textContent)
            .find((txt) => txt?.includes("📍")) || "";
        const date =
          Array.from(orderDiv.querySelectorAll("p"))
            .map((p) => p.textContent)
            .find((txt) => txt?.includes("🧾 Date")) || "";
        const items = Array.from(orderDiv.querySelectorAll("ul li"))
          .map((li) => li.textContent?.trim())
          .join("\n");
        const total =
          Array.from(orderDiv.querySelectorAll("span"))
            .map((s) => s.textContent)
            .find((txt) => txt?.includes("💰")) || "";

        return `
Order: ${name}
${orderId}
${address}
${date}

Items:
${items}

${total}
-----------------------------------------------
`;
      })
      .join("\n");

    // Open print window
    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) return;

    win.document.write(`
    <html>
      <head>
        <title>Admin Orders PDF</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            white-space: pre-wrap;
            line-height: 1.5;
            font-size: 14px;
            color: #000;
            padding: 20px;
          }
          h1 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Classy Diamonds - Order Records</h1>
        ${textOrders}
      </body>
    </html>
  `);

    win.document.close();
    win.focus();
    win.onload = () => {
      win.print();
      win.close();
    };
  }

  // 🔍 Filter & paginate
  const filtered = orders.filter((o) => {
    if (o.archived || o.shipped) return false;
    const q = searchQuery.toLowerCase();
    const matchQ =
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.stripeSessionId.toLowerCase().includes(q);
    const date = new Date(o.createdAt);
    const after = startDate ? date >= new Date(startDate) : true;
    const before = endDate ? date <= new Date(endDate) : true;
    return matchQ && after && before;
  });
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const pageData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return (
      <div className="p-6 text-red-300 font-semibold">❌ Unauthorized</div>
    );

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Admin Orders | Classy Diamonds</title>
      </Head>
      <Breadcrumbs />
      <h1 className="text-3xl font-serif font-bold mb-6">🛠 Admin Dashboard</h1>

      {/* 📂 Navigation */}
      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
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

      {/* 🔍 Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search…"
          className="px-4 py-2 rounded bg-[var(--bg-nav)] text-white flex-1"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input
          type="date"
          className="px-2 py-1 rounded bg-[var(--bg-nav)] text-white"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="px-2 py-1 rounded bg-[var(--bg-nav)] text-white"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button
          onClick={downloadCSV}
          className="bg-green-600 px-4 py-2 rounded text-sm"
        >
          Export CSV
        </button>
        <button
          onClick={printPDF}
          className="bg-blue-600 px-4 py-2 rounded text-sm"
        >
          Print PDF
        </button>
      </div>

      {/* 📦 Orders list */}
      <div id="print-area" className="space-y-8">
        {pageData.map((o) => (
          <div key={o._id} className="bg-[var(--bg-nav)] p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-1">
              {o.customerName} ({o.customerEmail})
            </h2>
            <p className="text-sm text-gray-300 mb-2">
              🔢 Order #: {o.orderNumber ?? "N/A"} | 🆔{" "}
              {o.stripeSessionId.slice(-8)}
            </p>

            <p className="mb-2">
              📍{" "}
              {o.shipping_address
                ? `${o.shipping_address.street}${
                    o.shipping_address.line2
                      ? `, ${o.shipping_address.line2}`
                      : ""
                  }, ${o.shipping_address.city}, ${o.shipping_address.state} ${
                    o.shipping_address.zip
                  }, ${o.shipping_address.country}`
                : o.shipping_address_string}
            </p>
            {o.addressSource && (
              <p className="text-xs text-gray-400 italic">
                (Address Source: {o.addressSource})
              </p>
            )}

            <p className="mb-4">
              🧾 Date: {new Date(o.createdAt).toLocaleString()}
            </p>

            <ul className="mb-4 list-disc pl-4 text-sm">
              {o.items.map((i, idx) => {
                const qty = i.quantity ?? 1;
                const displayPrice =
                  i.salePrice ??
                  i.discountedPrice ??
                  i.originalPrice ??
                  i.price ??
                  0;
                const basePrice = i.originalPrice ?? i.price ?? displayPrice;
                const orig = basePrice * qty;
                const sale = displayPrice * qty;

                // ✅ Match Account page behavior (no forced Cloudinary transform)
                const safeImage =
                  i.image && i.image.trim() !== ""
                    ? i.image
                    : "/products/placeholder.jpg";

                return (
                  <li key={idx} className="flex items-center gap-2">
                    <Image
                      src={safeImage}
                      alt={i.name}
                      width={48}
                      height={48}
                      className="rounded object-cover"
                      unoptimized
                    />
                    <span>
                      {i.name} – x{qty} –{" "}
                      {displayPrice < basePrice ? (
                        <>
                          <span className="line-through text-gray-400 mr-1">
                            ${orig.toFixed(2)}
                          </span>
                          <span className="text-green-400 font-semibold">
                            ${sale.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span>${sale.toFixed(2)}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                💰 Total: ${o.amount.toFixed(2)}
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => confirmAndShip(o.stripeSessionId)}
                  className="bg-green-600 px-4 py-2 rounded text-sm"
                >
                  Mark as Shipped 🚚
                </button>
                <button
                  onClick={() => archiveOrder(o.stripeSessionId)}
                  className="bg-yellow-600 px-4 py-2 rounded text-sm"
                >
                  Archive 🗂
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 📄 Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1
                  ? "bg-blue-600"
                  : "bg-[var(--bg-nav)] hover:bg-blue-500"
              }`}
            >
              {i + 1}
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
////14214
