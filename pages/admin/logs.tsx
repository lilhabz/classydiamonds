// ✅ pages/admin/logs.tsx – date range + sort + select + full-detail PDF printing 🔐📝

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface AdminLog {
  _id: string;
  orderId: string;
  action: "archive" | "restore" | "shipped" | "delivered" | "tracking";
  timestamp: string; // ISO string
  performedBy: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  discountedPrice?: number;
  salePrice?: number;
  originalPrice?: number;
  size?: string;
  image?: string;
}

interface OrderDetails {
  items: OrderItem[];
  amount: number;
  currency?: string; // e.g., "usd"
  customerAddress: string; // stringified; adjust if your API returns an object
  createdAt: string; // ISO string
  orderNumber?: number;
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession();

  const [orderLogs, setOrderLogs] = useState<
    { orderId: string; logs: AdminLog[] }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Stores fetched order details by orderId (used for expand + printing)
  const [expandedOrders, setExpandedOrders] = useState<
    Record<string, OrderDetails>
  >({});

  const [searchQuery, setSearchQuery] = useState("");

  // NEW: sort / date-range / selection
  const [sortBy, setSortBy] = useState<"log" | "order">("log");
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, boolean>>({}); // orderId -> checked

  useEffect(() => {
    if (session?.user?.isAdmin) fetchLogs();
  }, [session]);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      const grouped: Record<string, AdminLog[]> = {};
      (data.logs || []).forEach((log: AdminLog) => {
        if (!grouped[log.orderId]) grouped[log.orderId] = [];
        grouped[log.orderId].push(log);
      });

      // Sort logs per order (desc by timestamp)
      const aggregated = Object.entries(grouped)
        .map(([orderId, logs]) => ({
          orderId,
          logs: logs.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ),
        }))
        // Default: desc by latest log timestamp; we'll re-sort again at render by sortBy
        .sort(
          (a, b) =>
            new Date(b.logs[0].timestamp).getTime() -
            new Date(a.logs[0].timestamp).getTime()
        );

      setOrderLogs(aggregated);
    } catch (err) {
      console.error("❌ Failed to fetch admin logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    // toggle expand/collapse in UI
    if (expandedOrders[orderId]) {
      const updated = { ...expandedOrders };
      delete updated[orderId];
      setExpandedOrders(updated);
      return;
    }

    try {
      const res = await fetch(`/api/admin/order?orderId=${orderId}`);
      const data = await res.json();
      if (res.ok) {
        setExpandedOrders((prev) => ({ ...prev, [orderId]: data }));
      }
    } catch (err) {
      console.error("❌ Failed to fetch order details:", err);
    }
  };

  const ensureOrderDetails = async (orderId: string) => {
    if (expandedOrders[orderId]) return expandedOrders[orderId];
    try {
      const res = await fetch(`/api/admin/order?orderId=${orderId}`);
      const data = await res.json();
      if (res.ok) {
        setExpandedOrders((prev) => ({ ...prev, [orderId]: data }));
        return data as OrderDetails;
      }
    } catch (err) {
      console.error("❌ Failed to load details for print:", err);
    }
    return undefined;
  };

  const downloadCSV = () => {
    const headers = ["Order ID", "Action", "Timestamp", "Admin"];
    const rows: string[][] = [];
    orderLogs.forEach(({ orderId, logs }) => {
      logs.forEach((log) => {
        rows.push([
          orderId,
          log.action,
          new Date(log.timestamp).toLocaleString(),
          log.performedBy,
        ]);
      });
    });

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin_logs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ===== Helpers for sort/date/selection =====
  const getOrderDateForCompare = (orderId: string, logs: AdminLog[]) => {
    if (sortBy === "order" && expandedOrders[orderId]?.createdAt) {
      return new Date(expandedOrders[orderId].createdAt).getTime();
    }
    // fallback to latest log date
    return new Date(logs[0].timestamp).getTime();
  };

  const toggleSelect = (orderId: string) =>
    setSelected((s) => ({ ...s, [orderId]: !s[orderId] }));

  const selectAllFiltered = (ids: string[], checked: boolean) => {
    const next: Record<string, boolean> = {};
    ids.forEach((id) => (next[id] = checked));
    setSelected(next);
  };

  // ===== Filtering + sorting (computed) =====
  const filteredAndSorted = useMemo(() => {
    // text search
    const searched = orderLogs.filter(
      ({ orderId, logs }) =>
        orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        logs.some((l) =>
          l.performedBy.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    // date range
    const startMs = startDate
      ? new Date(startDate + "T00:00:00").getTime()
      : -Infinity;
    const endMs = endDate
      ? new Date(endDate + "T23:59:59").getTime()
      : Infinity;

    const dated = searched.filter(({ orderId, logs }) => {
      const t = getOrderDateForCompare(orderId, logs);
      return t >= startMs && t <= endMs;
    });

    // final sort (desc)
    return [...dated].sort((a, b) => {
      const ta = getOrderDateForCompare(a.orderId, a.logs);
      const tb = getOrderDateForCompare(b.orderId, b.logs);
      return tb - ta;
    });
  }, [orderLogs, searchQuery, startDate, endDate, sortBy, expandedOrders]);

  // ===== Printing: build a print-only HTML with full details for selected orders =====
  const moneyFmt = (currency: string | undefined) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "USD").toUpperCase(),
      minimumFractionDigits: 2,
    });

  const escapeHtml = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const buildOrderSectionHTML = (
    orderId: string,
    details: OrderDetails,
    logs: AdminLog[]
  ) => {
    const f = moneyFmt(details.currency);
    const itemsRows = details.items
      .map((it) => {
        const qty = it.quantity || 1;
        const display =
          it.salePrice ??
          it.discountedPrice ??
          it.originalPrice ??
          it.price ??
          0;
        const original = it.originalPrice ?? it.price ?? display;
        const hasSale =
          (it.salePrice ?? it.discountedPrice) !== undefined &&
          (it.salePrice ?? it.discountedPrice)! < (original || 0);
        const line = display * qty;
        const lineOriginal = original * qty;
        const sizeLine = it.size
          ? `<div class="muted">Size: ${escapeHtml(it.size)}</div>`
          : "";

        return `
          <tr>
            <td>
              <div class="item-name">${escapeHtml(it.name)}</div>
              ${sizeLine}
            </td>
            <td class="center">x${qty}</td>
            <td class="right">
              ${
                hasSale
                  ? `<span class="strike">${f.format(
                      lineOriginal
                    )}</span> <strong>${f.format(line)}</strong>`
                  : `<strong>${f.format(line)}</strong>`
              }
            </td>
          </tr>
        `;
      })
      .join("");

    const logsList = logs
      .map(
        (l) =>
          `<li>${new Date(l.timestamp).toLocaleString()} — <strong>${escapeHtml(
            l.action
          )}</strong> by ${escapeHtml(l.performedBy)}</li>`
      )
      .join("");

    return `
      <section class="order">
        <header>
          <h2>Order #${escapeHtml(details.orderNumber ?? "N/A")}</h2>
          <div class="meta">
            <div><strong>Order ID:</strong> ${escapeHtml(orderId)}</div>
            <div><strong>Order Date:</strong> ${new Date(
              details.createdAt
            ).toLocaleString()}</div>
          </div>
        </header>

        <div class="two-col">
          <div>
            <h3>Shipping Address</h3>
            <p>${escapeHtml(details.customerAddress)}</p>
          </div>
          <div class="totals">
            <h3>Total</h3>
            <p class="grand">${f.format(details.amount || 0)}</p>
          </div>
        </div>

        <h3>Items</h3>
        <table class="items">
          <thead>
            <tr><th>Item</th><th class="center">Qty</th><th class="right">Amount</th></tr>
          </thead>
          <tbody>
            ${
              itemsRows ||
              `<tr><td colspan="3" class="muted">No items</td></tr>`
            }
          </tbody>
        </table>

        <h3>Admin Action History</h3>
        <ul class="logs">
          ${logsList || `<li class="muted">No actions</li>`}
        </ul>
      </section>
      <hr />
    `;
  };

  const printSelectedAsPDF = async () => {
    const selectedIds = filteredAndSorted
      .map(({ orderId }) => orderId)
      .filter((id) => selected[id]);

    if (selectedIds.length === 0) return;

    // Ensure details for all selected orders
    const detailsById: Record<string, OrderDetails> = {};
    for (const id of selectedIds) {
      const det = expandedOrders[id] ?? (await ensureOrderDetails(id));
      if (det) detailsById[id] = det;
    }

    // Build sections HTML
    const sections = selectedIds
      .map((id) => {
        const details = detailsById[id];
        const logsForOrder =
          orderLogs.find((o) => o.orderId === id)?.logs || [];
        if (!details) return ""; // skip if details missing
        return buildOrderSectionHTML(id, details, logsForOrder);
      })
      .filter(Boolean)
      .join("\n");

    const docHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Orders – Print</title>
  <style>
    @media print { @page { margin: 18mm; } }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; margin:0; padding:18px; line-height:1.4; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    h2 { font-size: 18px; margin: 0 0 6px; }
    h3 { font-size: 15px; margin: 14px 0 6px; }
    .muted { color:#666; }
    .right { text-align:right; }
    .center { text-align:center; }
    .strike { text-decoration: line-through; color:#888; margin-right:6px; }
    header { display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid #ddd; padding-bottom:6px; margin-bottom:10px; }
    .meta { font-size:12px; color:#333; display:grid; gap:2px; }
    .two-col { display:grid; grid-template-columns: 1fr 220px; gap:16px; align-items:start; }
    .totals .grand { font-size:18px; font-weight:700; }
    table.items { width:100%; border-collapse:collapse; margin-top:4px; }
    table.items th, table.items td { border-bottom:1px solid #eee; padding:6px; vertical-align:top; }
    .item-name { font-weight:600; }
    ul.logs { margin:6px 0 0 18px; padding:0; }
    section.order { page-break-inside: avoid; margin-bottom: 18px; }
    hr { border:0; border-top:1px solid #ddd; margin:18px 0; page-break-after: always; }
  </style>
</head>
<body>
  <h1>Order Package</h1>
  ${sections || `<p class="muted">No printable orders.</p>`}
  <script>
    const hrs = document.querySelectorAll('hr');
    if (hrs.length) hrs[hrs.length - 1].remove();
  </script>
</body>
</html>
  `;

    // ✅ Print via hidden iframe (no popups, waits for load)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    // Use srcdoc so onload reliably fires after the content is parsed
    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) throw new Error("No iframe contentWindow");
        win.focus();
        win.print();
      } finally {
        // give the print dialog a moment; then clean up
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }
    };
    (iframe as any).srcdoc = docHtml;
  };

  if (status === "loading") {
    return <div className="p-6">Checking access...</div>;
  }
  if (!session?.user?.isAdmin) {
    return (
      <div className="p-6 text-red-300 font-semibold">
        ❌ Unauthorized – Admins only
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Admin Logs | Classy Diamonds</title>
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
        <Link href="/admin/logs" className="text-yellow-400">
          📝 Logs
        </Link>
      </nav>

      {/* Toolbar: search + dates + sort + export/select/print */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <input
            type="text"
            placeholder="Search by Order ID or Admin..."
            className="w-full sm:w-72 px-4 py-2 rounded bg-[var(--bg-nav)] text-[var(--foreground)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80">Start</label>
            <input
              type="date"
              className="px-3 py-2 rounded bg-[var(--bg-nav)] text-[var(--foreground)]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80">End</label>
            <input
              type="date"
              className="px-3 py-2 rounded bg-[var(--bg-nav)] text-[var(--foreground)]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80">Sort by</label>
            <select
              className="px-3 py-2 rounded bg-[var(--bg-nav)] text-[var(--foreground)]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "log" | "order")}
            >
              <option value="log">Latest Log Time</option>
              <option value="order">Order Created Date</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            className="text-sm bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV 📄
          </button>
          <button
            onClick={() => {
              const ids = filteredAndSorted.map(({ orderId }) => orderId);
              const allSelected = ids.every((id) => selected[id]);
              selectAllFiltered(ids, !allSelected);
            }}
            className="text-sm bg-[var(--bg-nav)] px-4 py-2 rounded hover:opacity-90"
          >
            {filteredAndSorted.every(({ orderId }) => selected[orderId])
              ? "Unselect All"
              : "Select All"}
          </button>
          <button
            onClick={printSelectedAsPDF}
            className="text-sm bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={!Object.values(selected).some(Boolean)}
          >
            Print Selected 🖨️
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : filteredAndSorted.length === 0 ? (
        <p>No matching admin logs found.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[var(--bg-nav)]">
              <tr>
                <th className="py-2 px-4"></th>
                <th className="py-2 px-4">🆔 Order ID</th>
                <th className="py-2 px-4">Action</th>
                <th className="py-2 px-4">Time</th>
                <th className="py-2 px-4">Admin</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map(({ orderId, logs }) => {
                const latest = logs[0];
                return (
                  <>
                    <tr
                      key={orderId}
                      className="border-b border-[var(--bg-nav)] cursor-pointer"
                      onClick={() => fetchOrderDetails(orderId)}
                    >
                      {/* checkbox (don’t trigger expand) */}
                      <td
                        className="py-2 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected[orderId]}
                          onChange={() => toggleSelect(orderId)}
                        />
                      </td>

                      <td className="py-2 px-4 text-blue-300 hover:text-blue-400">
                        {orderId.slice(-8)}
                      </td>

                      <td
                        className={`py-2 px-4 capitalize ${
                          latest.action === "shipped"
                            ? "text-green-400"
                            : latest.action === "delivered"
                            ? "text-purple-400"
                            : latest.action === "restore"
                            ? "text-blue-400"
                            : latest.action === "tracking"
                            ? "text-teal-300"
                            : "text-yellow-300"
                        }`}
                      >
                        {latest.action}
                      </td>

                      <td className="py-2 px-4 text-sm">
                        {new Date(latest.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-400">
                        {latest.performedBy}
                      </td>
                    </tr>

                    {/* Expanded details (optional; still useful visually) */}
                    {expandedOrders[orderId] && (
                      <tr className="bg-[#2a374f]">
                        <td colSpan={5} className="px-6 py-4">
                          <p className="mb-2 text-sm">
                            🔢 Order #:{" "}
                            {expandedOrders[orderId].orderNumber ?? "N/A"}
                          </p>
                          <p className="mb-2 text-sm">
                            📍 Address:{" "}
                            {expandedOrders[orderId].customerAddress}
                          </p>
                          <p className="mb-2 text-sm">
                            🧾 Order Date:{" "}
                            {new Date(
                              expandedOrders[orderId].createdAt
                            ).toLocaleString()}
                          </p>
                          <ul className="pl-4 list-disc text-sm mb-2">
                            {expandedOrders[orderId].items.map((item, i) => {
                              const qty = item.quantity || 1;
                              const display =
                                item.salePrice ??
                                item.discountedPrice ??
                                item.originalPrice ??
                                item.price ??
                                0;
                              return (
                                <li key={i}>
                                  {qty}× {item.name}
                                  {item.size ? ` (Size ${item.size})` : ""} – $
                                  {(qty * display).toFixed(2)}
                                </li>
                              );
                            })}
                          </ul>
                          <p className="font-semibold mb-2">
                            💰 Total: $
                            {expandedOrders[orderId].amount.toFixed(2)}
                          </p>
                          <div className="text-sm mt-4">
                            <p className="font-semibold mb-1">Admin Actions:</p>
                            <ul className="list-disc pl-4 space-y-1">
                              {logs.map((l) => (
                                <li key={l._id}>
                                  {new Date(l.timestamp).toLocaleString()} –{" "}
                                  {l.action} by {l.performedBy}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
}
