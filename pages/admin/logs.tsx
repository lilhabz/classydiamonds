// ✅ pages/admin/logs.tsx – date range + sort + select (no CSV/PDF) 🔐📝

import { useEffect, useMemo, useState, Fragment } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface AdminLog {
  _id: string;
  orderId: string;
  action:
    | "archive"
    | "restore"
    | "shipped"
    | "delivered"
    | "tracking"
    | "refunded";
  timestamp: string;
  performedBy: string;
  reason?: string;
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
  currency?: string;
  customerAddress: any;
  createdAt: string;
  orderNumber?: number;
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession();

  const [orderLogs, setOrderLogs] = useState<
    { orderId: string; logs: AdminLog[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<
    Record<string, OrderDetails>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"log" | "order">("log");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

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
      const aggregated = Object.entries(grouped)
        .map(([orderId, logs]) => ({
          orderId,
          logs: logs.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ),
        }))
        .sort(
          (a, b) =>
            new Date(b.logs[0].timestamp).getTime() -
            new Date(a.logs[0].timestamp).getTime()
        )
        .reverse();
      setOrderLogs(aggregated);
    } catch (err) {
      console.error("❌ Failed to fetch admin logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
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

  const getOrderDateForCompare = (orderId: string, logs: AdminLog[]) => {
    if (sortBy === "order" && expandedOrders[orderId]?.createdAt) {
      return new Date(expandedOrders[orderId].createdAt).getTime();
    }
    return new Date(logs[0].timestamp).getTime();
  };

  const toggleSelect = (orderId: string) =>
    setSelected((s) => ({ ...s, [orderId]: !s[orderId] }));

  const selectAllFiltered = (ids: string[], checked: boolean) => {
    const next: Record<string, boolean> = {};
    ids.forEach((id) => (next[id] = checked));
    setSelected(next);
  };

  const formatAddress = (addr: any) => {
    if (!addr) return "N/A";
    if (typeof addr === "string") return addr;
    const parts = [
      addr.street || addr.line1,
      addr.line2,
      addr.city,
      addr.state,
      addr.zip || addr.postal_code,
      addr.country,
    ]
      .filter(Boolean)
      .join(", ");
    return parts || "N/A";
  };

  const filteredAndSorted = useMemo(() => {
    const searched = orderLogs.filter(({ orderId, logs }) => {
      const q = searchQuery.toLowerCase();
      return (
        orderId.toLowerCase().includes(q) ||
        logs.some((l) => l.performedBy.toLowerCase().includes(q))
      );
    });
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
    return [...dated].sort((a, b) => {
      const ta = getOrderDateForCompare(a.orderId, a.logs);
      const tb = getOrderDateForCompare(b.orderId, b.logs);
      return tb - ta;
    });
  }, [orderLogs, searchQuery, startDate, endDate, sortBy, expandedOrders]);

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

      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
        <Link href="/admin" className="hover:text-yellow-300">
          📦 Orders
        </Link>
        <Link href="/admin/completed" className="hover:text-yellow-300">
          ✅ Shipped
        </Link>
        <Link href="/admin/refunded" className="hover:text-yellow-300">
          💸 Refunded
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

      {/* Toolbar: search + dates + sort + selection */}
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
                  <Fragment key={orderId}>
                    <tr
                      className="border-b border-[var(--bg-nav)] cursor-pointer"
                      onClick={() => fetchOrderDetails(orderId)}
                    >
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
                            : latest.action === "refunded"
                            ? "text-red-400"
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
                    {expandedOrders[orderId] && (
                      <tr className="bg-[#2a374f]">
                        <td colSpan={5} className="px-6 py-4">
                          <p className="mb-2 text-sm">
                            🔢 Order #:{" "}
                            {expandedOrders[orderId].orderNumber ?? "N/A"}
                          </p>
                          <p className="mb-2 text-sm">
                            📍 Address:{" "}
                            {formatAddress(
                              expandedOrders[orderId].customerAddress
                            )}
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
                  </Fragment>
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
