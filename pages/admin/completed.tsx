// ✅ Enhanced pages/admin/completed.tsx with size badges, fixed total, archive logic, and unified dashboard nav 🔐🛠️

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface OrderItem {
  name: string;
  quantity?: number;
  price?: number;
  discountedPrice?: number;
  salePrice?: number;
  originalPrice?: number;
  image?: string;
  size?: string; // 🆕 ring size
}

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items?: OrderItem[];
  amount: number;
  createdAt: string;
  stripeSessionId: string;
  orderNumber?: number;
  shippedAt?: string;
  trackingNumber?: string;
  carrier?: string;
  trackingEmailSentAt?: string;
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
  const [savedTracking, setSavedTracking] = useState<Record<string, string>>(
    {}
  );
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>(
    {}
  );
  const itemsPerPage = 5;

  useEffect(() => {
    if (session?.user?.isAdmin) fetchCompletedOrders();
  }, [session]);

  const fetchCompletedOrders = async () => {
    try {
      const res = await fetch("/api/admin/completed");
      const data = await res.json();
      setOrders(data.orders || []);
      const saved: Record<string, string> = {};
      (data.orders || []).forEach((o: Order) => {
        if (o.trackingNumber) saved[o.stripeSessionId] = o.trackingNumber;
      });
      setSavedTracking(saved);
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
        (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
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
    if (savedTracking[orderId] === input.trackingNumber) return;

    try {
      setSavingTracking((p) => ({ ...p, [orderId]: true }));
      const adminName =
        (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
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
        setSavedTracking((prev) => ({
          ...prev,
          [orderId]: input.trackingNumber,
        }));
        alert("✅ Tracking saved and email sent.");
        fetchCompletedOrders();
      } else {
        alert("❌ " + result.error);
      }
    } catch (err) {
      console.error("❌ Error updating tracking:", err);
    } finally {
      setSavingTracking((p) => ({ ...p, [orderId]: false }));
    }
  };

  const archiveOrder = async (orderId: string) => {
    const confirmed = window.confirm(
      `🗂 Archive this order?\nOrder ID: ${orderId}`
    );
    if (!confirmed) return;

    try {
      const adminName =
        (session?.user as any)?.firstName || session?.user?.name?.split(" ")[0];
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
        .map((i) => {
          const qty = i.quantity ?? 1;
          const price = i.price ?? i.discountedPrice ?? i.salePrice ?? 0;
          const label = i.size
            ? `${i.name} (Size ${i.size})`
            : i.name || "Unnamed";
          return `${qty}× ${label} - $${(qty * price).toFixed(2)}`;
        })
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

  function printPDF() {
    const shippedOrdersArea = document.getElementById("print-area");
    if (!shippedOrdersArea) return;

    const textOrders = Array.from(
      shippedOrdersArea.querySelectorAll(".bg-[var(--bg-nav)]")
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
            .find((txt) => txt?.includes("🧾 Shipped")) || "";
        const tracking =
          Array.from(orderDiv.querySelectorAll("p"))
            .map((p) => p.textContent)
            .find((txt) => txt?.includes("Tracking")) || "Tracking: N/A";
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
${tracking}

Items:
${items}

${total}
-----------------------------------------------
`;
      })
      .join("\n");

    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) return;

    win.document.write(`
    <html>
      <head>
        <title>Completed (Shipped) Orders PDF</title>
        <style>
          body { font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.5; font-size: 14px; color: #000; padding: 20px; }
          h1 { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Classy Diamonds - Completed (Shipped) Orders</h1>
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

      <h1 className="text-3xl font-serif font-bold tracking-wide mb-6">
        🛠️ Admin Dashboard
      </h1>

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
                className="bg-[var(--bg-nav)] p-6 rounded-xl shadow"
              >
                <h2 className="text-xl font-semibold mb-1">
                  {order.customerName} ({order.customerEmail})
                </h2>
                <p className="text-sm text-gray-300 mb-2">
                  🔢 Order #: {order.orderNumber ?? "N/A"} | 🆔{" "}
                  {order.stripeSessionId.slice(-8)}
                </p>
                <p className="mb-2">📍 {order.customerAddress}</p>
                <p className="mb-4">
                  🧾 Shipped: {new Date(order.shippedAt || "").toLocaleString()}
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
                            ...(prev[order.stripeSessionId] || {
                              trackingNumber: "",
                              carrier: "USPS",
                            }),
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
                        trackingInputs[order.stripeSessionId]?.trackingNumber ||
                        ""
                      }
                      onChange={(e) =>
                        setTrackingInputs((prev) => ({
                          ...prev,
                          [order.stripeSessionId]: {
                            ...(prev[order.stripeSessionId] || {
                              trackingNumber: "",
                              carrier: "USPS",
                            }),
                            trackingNumber: e.target.value,
                          },
                        }))
                      }
                      className="px-2 py-1 rounded bg-[#2e3a58] text-white flex-1"
                    />
                    {(() => {
                      const inputVal =
                        trackingInputs[order.stripeSessionId]?.trackingNumber ||
                        "";
                      const isSaved =
                        !!inputVal &&
                        savedTracking[order.stripeSessionId] === inputVal;
                      const isSaving = savingTracking[order.stripeSessionId];
                      return (
                        <button
                          onClick={() => updateTracking(order.stripeSessionId)}
                          disabled={isSaved || isSaving}
                          className="bg-green-600 px-3 py-1 rounded text-sm disabled:opacity-50"
                        >
                          {isSaved
                            ? "✅ Saved"
                            : isSaving
                            ? "Saving..."
                            : "Save Tracking"}
                        </button>
                      );
                    })()}
                  </div>
                )}

                <div className="mt-4">
                  <strong>Items:</strong>
                  {Array.isArray(order.items) && order.items.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {order.items.map((item, i) => {
                        const qty = item.quantity ?? 1;
                        const displayPrice =
                          item.salePrice ??
                          item.discountedPrice ??
                          item.originalPrice ??
                          item.price ??
                          0;
                        const basePrice =
                          item.originalPrice ?? item.price ?? displayPrice;
                        const orig = basePrice * qty;
                        const sale = displayPrice * qty;
                        const safeImage =
                          item.image && item.image.trim() !== ""
                            ? item.image
                            : "/products/gray-placeholder.jpg";

                        return (
                          <li key={i} className="flex items-center gap-2">
                            <Image
                              src={safeImage}
                              alt={item.name || "Product image"}
                              width={48}
                              height={48}
                              className="rounded object-cover"
                              unoptimized
                            />
                            <span>
                              {item.name || "Unnamed"}
                              {item.size && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white align-middle">
                                  Size: {item.size}
                                </span>
                              )}{" "}
                              – x{qty} –{" "}
                              {displayPrice < basePrice ? (
                                <>
                                  <span className="line-through mr-1">
                                    ${orig.toFixed(2)}
                                  </span>
                                  <span className="text-green-400">
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
                  ) : (
                    <p className="text-sm text-red-300 mt-2">
                      ⚠️ No item data available.
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-lg font-semibold">
                    💰 Total: ${order.amount.toFixed(2)}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => markDelivered(order.stripeSessionId)}
                      className="bg-blue-600 px-4 py-2 rounded text-sm"
                    >
                      Delivered 📬
                    </button>
                    <button
                      onClick={() => archiveOrder(order.stripeSessionId)}
                      className="bg-yellow-600 px-4 py-2 rounded text-sm"
                    >
                      Archive 🗂
                    </button>
                  </div>
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
