// 📄 pages/admin/index.tsx
// 🧭 Unified Admin Dashboard with Custom & Logs tabs, "who did what", and Force Delete 🗑

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Breadcrumbs from "@/components/Breadcrumbs";
import RefundDialog from "@/components/RefundDialog";

// Use RELATIVE dynamic imports so we don't depend on an alias
const CustomPhotosPanel = dynamic(
  () => import("../../components/admin/CustomPhotosPanel"),
  { ssr: false }
);
const LogsPanel = dynamic(
  () => import("../../components/admin/LogsPanel"),
  { ssr: false }
);

/* ----------------------------- helpers ----------------------------- */
const safeStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v == null ? fallback : String(v);

const n = (v: unknown, d = 0): number => {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, "");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : d;
  }
  return d;
};

type Stage = "orders" | "shipped" | "delivered" | "archived" | "custom" | "logs";

// Matches your logs API
type AdminAction =
  | "archive"
  | "restore"
  | "shipped"
  | "delivered"
  | "tracking"
  | "refund"
  | "delete_order"
  | "delete_order_bulk_junk";
type AdminLog = {
  _id: string;
  orderId: string;         // may be stripeSessionId OR mongo _id
  action: AdminAction;
  timestamp: string;
  performedBy: string;
  amount?: number;
  refundId?: string;
  provider?: string;
  note?: string;
};

interface BaseItem {
  name?: string;
  quantity?: number | string;
  image?: string | null;
  size?: string;
  unitPrice?: number | string;
  salePrice?: number | string;
  discountedPrice?: number | string;
  originalPrice?: number | string;
  price?: number | string;
}

interface BaseOrder {
  _id?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  shipping_address_string?: string;
  items?: BaseItem[];
  amount?: number | string;
  refundedTotal?: number | string; // cents
  createdAt?: string;
  stripeSessionId?: string;
  orderNumber?: number | null;
  shipped?: boolean;
  shippedAt?: string;
  delivered?: boolean;
  deliveredAt?: string;
  archived?: boolean;
  trackingNumber?: string;
  carrier?: string;
}

/* ----------------------------- component --------------------------- */
export default function AdminUnifiedPage() {
  const { data: session, status } = useSession();

  const [tab, setTab] = useState<Stage>("orders");

  // ✅ Router + URL sync for tabs
  const router = useRouter();
  useEffect(() => {
    const q = router.query.tab;
    if (
      q === "orders" ||
      q === "shipped" ||
      q === "delivered" ||
      q === "archived" ||
      q === "custom" ||
      q === "logs"
    ) {
      setTab(q as Stage);
    }
  }, [router.query.tab]);

  const changeTab = (t: Stage) => {
    setTab(t);
    router.replace({ pathname: "/admin", query: { tab: t } }, undefined, { shallow: true });
  };

  // orders data (for order tabs)
  const [orders, setOrders] = useState<BaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // filters (orders tabs)
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // paging (orders tabs)
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // tracking (shipped tab)
  const [trackingInputs, setTrackingInputs] = useState<
    Record<string, { trackingNumber: string; carrier: string }>
  >({});
  const [savedTracking, setSavedTracking] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>({});

  // refunds
  const [refundTarget, setRefundTarget] = useState<{
    sessionId: string;
    maxCents: number;
  } | null>(null);

  // 🆕 latest admin log per order (who did what latest)
  const [latestLogByOrder, setLatestLogByOrder] = useState<
    Record<string, AdminLog>
  >({});

  // fetch orders per tab
  useEffect(() => {
    if (!session?.user?.isAdmin) return;

    if (tab === "custom" || tab === "logs") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPage(1);
    (async () => {
      try {
        let endpoint = "/api/admin/orders";
        if (tab === "shipped") endpoint = "/api/admin/completed";
        if (tab === "delivered") endpoint = "/api/admin/delivered";
        if (tab === "archived") endpoint = "/api/admin/archived";

        const res = await fetch(endpoint);
        const data = await res.json();
        const list: BaseOrder[] = Array.isArray(data.orders) ? data.orders : [];
        setOrders(list);

        if (tab === "shipped") {
          const map: Record<string, string> = {};
          list.forEach((o: BaseOrder) => {
            const sid = safeStr(o.stripeSessionId);
            if (sid && o.trackingNumber) map[sid] = safeStr(o.trackingNumber);
          });
          setSavedTracking(map);
        } else {
          setSavedTracking({});
        }
      } catch (e) {
        console.error("❌ fetch error:", e);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tab, session?.user?.isAdmin]);

  // fetch logs ONCE per visit to any orders-like tab; map latest log per orderId
  useEffect(() => {
    if (!session?.user?.isAdmin) return;
    if (tab === "custom" || tab === "logs") return;

    (async () => {
      try {
        const res = await fetch("/api/admin/logs");
        const data = await res.json();
        const logs: AdminLog[] = Array.isArray(data?.logs) ? data.logs : Array.isArray(data) ? data : [];

        const map: Record<string, AdminLog> = {};
        logs.forEach((l) => {
          const key = l.orderId;
          const prev = map[key];
          if (!prev || new Date(l.timestamp).getTime() > new Date(prev.timestamp).getTime()) {
            map[key] = l;
          }
        });
        setLatestLogByOrder(map);
      } catch (e) {
        console.warn("⚠️ Could not load admin logs for badges:", e);
        setLatestLogByOrder({});
      }
    })();
  }, [tab, session?.user?.isAdmin]);

  /* --------------------------- actions ----------------------------- */
  const adminName =
    (session?.user as any)?.firstName ||
    safeStr(session?.user?.name).split(" ")[0] ||
    "Admin";

  async function markShipped(sessionId?: string) {
    const id = safeStr(sessionId);
    if (!id) return alert("Missing order id");
    if (!confirm(`📦 Mark order ${id.slice(-8)} as shipped?`)) return;
    const res = await fetch("/api/shipped", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, adminName }),
    });
    const ok = res.ok;
    const json = await res.json().catch(() => ({}));
    if (!ok) return alert("❌ " + (json?.error || "Failed"));
    reload();
  }

  async function markDelivered(sessionId?: string) {
    const id = safeStr(sessionId);
    if (!id) return alert("Missing order id");
    if (!confirm(`📬 Mark order ${id.slice(-8)} as delivered?`)) return;
    const res = await fetch("/api/delivered", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, adminName }),
    });
    const ok = res.ok;
    const json = await res.json().catch(() => ({}));
    if (!ok) return alert("❌ " + (json?.error || "Failed"));
    reload();
  }

  async function archive(sessionId?: string) {
    const id = safeStr(sessionId);
    if (!id) return alert("Missing order id");
    if (!confirm(`🗂 Archive order ${id.slice(-8)}?`)) return;
    const res = await fetch("/api/admin/archived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, adminName }),
    });
    const ok = res.ok;
    const json = await res.json().catch(() => ({}));
    if (!ok) return alert("❌ " + (json?.error || "Failed"));
    reload();
  }

  async function restore(sessionId?: string) {
    const id = safeStr(sessionId);
    if (!id) return alert("Missing order id");
    if (!confirm(`♻️ Restore order ${id.slice(-8)}?`)) return;
    const res = await fetch("/api/admin/archived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, restore: true, adminName }),
    });
    const ok = res.ok;
    const json = await res.json().catch(() => ({}));
    if (!ok) return alert("❌ " + (json?.error || "Failed"));
    changeTab("orders");
  }

  // Save tracking number + carrier for a shipped order
async function saveTracking(sessionId: string) {
  const input = trackingInputs[sessionId];
  if (!input?.trackingNumber) return alert("❌ Please enter a tracking number.");
  if (savedTracking[sessionId] === input.trackingNumber) return; // nothing to do

  try {
    setSavingTracking((p) => ({ ...p, [sessionId]: true }));
    const res = await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: sessionId,
        trackingNumber: input.trackingNumber,
        carrier: input.carrier,
        adminName, // shows who did it in your logs
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to save tracking");

    // cache the last saved value so button shows "✅ Saved"
    setSavedTracking((prev) => ({ ...prev, [sessionId]: input.trackingNumber }));
    alert("✅ Tracking saved" + (json?.emailSent ? " and email sent." : "."));
    reload();
  } catch (e: any) {
    alert("❌ " + (e?.message || "Failed to save tracking"));
  } finally {
    setSavingTracking((p) => ({ ...p, [sessionId]: false }));
  }
}


  // 🗑 Force delete via your /api/admin/delete-order (POST)
  async function forceDeleteOrder(opts: { mongoId?: string; sessionId?: string; note?: string }) {
    const { mongoId, sessionId, note } = opts;
    if (!mongoId && !sessionId) return alert("Missing identifier (mongoId or sessionId).");
    if (!confirm("⚠️ Permanently delete this order? A backup will be stored in orders_deleted.")) return;

    try {
      const res = await fetch("/api/admin/delete-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: mongoId,
          sessionId,
          force: true, // allow delete even if not archived/junk
          note: note || "manual force delete from admin UI",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      alert("✅ Order removed");
      reload();
    } catch (e: any) {
      alert("❌ " + e.message);
    }
  }

  function openRefund(o: BaseOrder) {
    const sessionId = safeStr(o.stripeSessionId);
    if (!sessionId) return alert("❌ Missing Stripe session id on this order.");
    const totalCents = Math.max(0, Math.round(n(o.amount, 0) * 100));
    const refundedCents = Math.max(0, Math.round(n(o.refundedTotal, 0)));
    const maxCents = Math.max(0, totalCents - refundedCents);
    if (maxCents <= 0) return alert("Nothing left to refund for this order.");
    setRefundTarget({ sessionId, maxCents });
  }

  function reload() {
    setLoading(true);
    setTimeout(() => setTab((t) => t), 0);
  }

  /* --------------------------- filtering/paging ---------------------- */
  const filtered = useMemo(() => {
    if (tab === "custom" || tab === "logs") return [];
    const q = search.toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return (orders || []).filter((o: BaseOrder) => {
      if (tab === "orders" && (o.archived || o.shipped)) return false;
      if (tab === "shipped" && (o.archived || o.delivered)) return false;
      if (tab === "delivered" && o.archived) return false;
      if (tab === "archived" && !o.archived) return false;

      const name = safeStr(o.customerName).toLowerCase();
      const email = safeStr(o.customerEmail).toLowerCase();
      const sess = safeStr(o.stripeSessionId).toLowerCase();
      const matchQ = !q || name.includes(q) || email.includes(q) || sess.includes(q);

      let dateStr =
        tab === "shipped"
          ? o.shippedAt
          : tab === "delivered"
          ? o.deliveredAt
          : o.createdAt;

      const d = dateStr ? new Date(dateStr) : new Date(0);
      const after = start ? d >= start : true;
      const before = end ? d <= end : true;

      return matchQ && after && before;
    });
  }, [orders, search, startDate, endDate, tab]);

  const totalPages =
    tab === "custom" || tab === "logs"
      ? 1
      : Math.max(1, Math.ceil(filtered.length / Math.max(1, itemsPerPage)));
  const pageData =
    tab === "custom" || tab === "logs"
      ? []
      : filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return <div className="p-6 text-red-300 font-semibold">❌ Unauthorized</div>;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Admin | Classy Diamonds</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 -mt-2 mb-6">
        <Breadcrumbs />
      </div>

      <h1 className="text-3xl font-serif font-bold tracking-wide mb-4">🛠️ Admin Dashboard</h1>

      {/* Top nav */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 text-sm font-semibold border-b border-[var(--bg-nav)] pb-3">
        <Link href={{ pathname: "/admin", query: { tab: "orders" } }} onClick={(e) => { e.preventDefault(); changeTab("orders"); }} className={tab === "orders" ? "text-yellow-400" : "hover:text-yellow-300"}>
          📦 Orders
        </Link>
        <Link href={{ pathname: "/admin", query: { tab: "shipped" } }} onClick={(e) => { e.preventDefault(); changeTab("shipped"); }} className={tab === "shipped" ? "text-yellow-400" : "hover:text-yellow-300"}>
          ✅ Shipped
        </Link>
        <Link href={{ pathname: "/admin", query: { tab: "delivered" } }} onClick={(e) => { e.preventDefault(); changeTab("delivered"); }} className={tab === "delivered" ? "text-yellow-400" : "hover:text-yellow-300"}>
          📬 Delivered
        </Link>
        <Link href={{ pathname: "/admin", query: { tab: "archived" } }} onClick={(e) => { e.preventDefault(); changeTab("archived"); }} className={tab === "archived" ? "text-yellow-400" : "hover:text-yellow-300"}>
          🗂 Archived
        </Link>
        <Link href={{ pathname: "/admin", query: { tab: "custom" } }} onClick={(e) => { e.preventDefault(); changeTab("custom"); }} className={tab === "custom" ? "text-yellow-400" : "hover:text-yellow-300"}>
          🖼 Custom
        </Link>
        <Link href={{ pathname: "/admin", query: { tab: "logs" } }} onClick={(e) => { e.preventDefault(); changeTab("logs"); }} className={tab === "logs" ? "text-yellow-400" : "hover:text-yellow-300"}>
          📝 Logs
        </Link>

        <span className="opacity-50 mx-2">|</span>
        <Link href="/admin/products" className="hover:text-yellow-300">
          🛠 Products
        </Link>
      </div>

      {/* Filters (order tabs only) */}
      {!(tab === "custom" || tab === "logs") && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, email, or ID…"
            className="px-4 py-2 rounded bg-[var(--bg-nav)] text-white flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        </div>
      )}

      {/* CONTENT */}
      {tab === "custom" ? (
        <CustomPhotosPanel />
      ) : tab === "logs" ? (
        <LogsPanel />
      ) : loading ? (
        <p>Loading {tab}…</p>
      ) : pageData.length === 0 ? (
        <p>No matching orders found.</p>
      ) : (
        <div className="space-y-8">
          {pageData.map((o: BaseOrder) => {
            const sid = safeStr(o.stripeSessionId);
            const refundedCents = Math.max(0, Math.round(n(o.refundedTotal, 0)));
            const totalCents = Math.max(0, Math.round(n(o.amount, 0) * 100));
            const refundableCents = Math.max(0, totalCents - refundedCents);

            // 🆕 pick latest log by either stripeSessionId or mongo _id (logs may use either)
            const lastLog =
              (sid && latestLogByOrder[sid]) ||
              (o._id && latestLogByOrder[o._id]) ||
              undefined;

            return (
              <div key={o._id || sid} className="bg-[var(--bg-nav)] p-6 rounded-xl shadow">
                <h2 className="text-xl font-semibold mb-1">
                  {safeStr(o.customerName, "Customer")} ({safeStr(o.customerEmail, "—")})
                </h2>
                <p className="text-sm text-gray-300 mb-2">
                  🔢 Order #: {o.orderNumber ?? "N/A"} | 🆔 {sid ? sid.slice(-8) : (o._id ? o._id.slice(-8) : "—")}
                </p>

                {/* Who did what (latest) */}
                {lastLog ? (
                  <p className="text-xs mb-2 opacity-90">
                    👤 <span className="font-medium">{lastLog.performedBy || "—"}</span> •{" "}
                    <span className="capitalize">{lastLog.action}</span> •{" "}
                    {new Date(lastLog.timestamp).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xs mb-2 opacity-60">👤 No admin activity logged yet</p>
                )}

                <p className="mb-2 text-sm">
                  📍 {safeStr(o.customerAddress) || safeStr(o.shipping_address_string) || "—"}
                </p>

                <p className="mb-4 text-sm">
                  {tab === "shipped"
                    ? <>🧾 Shipped: {o.shippedAt ? new Date(o.shippedAt).toLocaleString() : "—"}</>
                    : tab === "delivered"
                    ? <>🧾 Delivered: {o.deliveredAt ? new Date(o.deliveredAt).toLocaleString() : "—"}</>
                    : <>🧾 Date: {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</>}
                </p>

                {/* tracking on shipped */}
                {tab === "shipped" && (
                  <>
                    {o.trackingNumber ? (
                      <p className="mb-2">
                        <strong>Tracking:</strong> {o.trackingNumber}
                        {o.carrier ? ` (${o.carrier})` : ""}
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                        <select
                          value={trackingInputs[sid]?.carrier || "USPS"}
                          onChange={(e) =>
                            setTrackingInputs((prev) => ({
                              ...prev,
                              [sid]: {
                                ...(prev[sid] || { trackingNumber: "", carrier: "USPS" }),
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
                          value={trackingInputs[sid]?.trackingNumber || ""}
                          onChange={(e) =>
                            setTrackingInputs((prev) => ({
                              ...prev,
                              [sid]: {
                                ...(prev[sid] || { trackingNumber: "", carrier: "USPS" }),
                                trackingNumber: e.target.value,
                              },
                            }))
                          }
                          className="px-2 py-1 rounded bg-[#2e3a58] text-white flex-1"
                        />

                        {(() => {
                          const inputVal = trackingInputs[sid]?.trackingNumber || "";
                          const isSaved = !!inputVal && savedTracking[sid] === inputVal;
                          const isSaving = savingTracking[sid];
                          return (
                            <button
                              onClick={() => saveTracking(sid)}
                              disabled={isSaved || isSaving}
                              className="bg-green-600 px-3 py-1 rounded text-sm disabled:opacity-50"
                            >
                              {isSaved ? "✅ Saved" : isSaving ? "Saving…" : "Save Tracking"}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}

                {/* items */}
                <div className="mt-4">
                  <strong>Items:</strong>
                  {Array.isArray(o.items) && o.items.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {o.items.map((it: BaseItem, i: number) => {
                        const qty = Math.max(1, Math.round(n(it.quantity, 1)));
                        const unit =
                          n(it.unitPrice) ||
                          n(it.salePrice) ||
                          n(it.discountedPrice) ||
                          n(it.originalPrice) ||
                          n(it.price);
                        const base = n(it.originalPrice) || n(it.price) || unit;
                        const lineOrig = base * qty;
                        const lineSale = unit * qty;
                        const src =
                          it.image && safeStr(it.image).trim() !== ""
                            ? safeStr(it.image)
                            : "/products/gray-placeholder.jpg";
                        return (
                          <li key={i} className="flex items-center gap-2">
                            <Image
                              src={src}
                              alt={safeStr(it.name, "Item")}
                              width={48}
                              height={48}
                              className="rounded object-cover"
                              unoptimized
                            />
                            <div className="flex flex-col">
                              <div className="font-normal">
                                {safeStr(it.name, "Item")}
                                {it.size && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white align-middle">
                                    Size: {it.size}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-300 mt-0.5">Unit: ${unit.toFixed(2)}</div>
                            </div>
                            <span className="ml-2">
                              – x{qty} –{" "}
                              {unit < base ? (
                                <>
                                  <span className="line-through mr-1">${lineOrig.toFixed(2)}</span>
                                  <span className="text-green-400">${lineSale.toFixed(2)}</span>
                                </>
                              ) : (
                                <span>${lineSale.toFixed(2)}</span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-red-300 mt-2">⚠️ No item data available.</p>
                  )}
                </div>

                {/* footer actions */}
                <div className="flex flex-wrap gap-2 justify-between items-center mt-4">
                  <span className="text-lg font-semibold">
                    💰 Total: ${n(o.amount, 0).toFixed(2)}
                    {refundedCents > 0 && (
                      <span className="ml-2 text-sm text-gray-300">• Refunded {(refundedCents / 100).toFixed(2)}</span>
                    )}
                  </span>

                  <div className="space-x-2">
                    <Link href={`/admin/order/${sid || o._id || ""}`}>
                      <span className="bg-blue-600 px-4 py-2 rounded text-sm cursor-pointer">View 🔍</span>
                    </Link>

                    {tab === "orders" && (
                      <>
                        <button
                          onClick={() => openRefund(o)}
                          className="bg-indigo-600 px-4 py-2 rounded text-sm disabled:opacity-60"
                          disabled={refundableCents <= 0 || !sid}
                          title={
                            !sid
                              ? "Missing Stripe session id"
                              : `Refund up to $${(refundableCents / 100).toFixed(2)}`
                          }
                        >
                          Refund 💳
                        </button>
                        <button onClick={() => markShipped(sid)} className="bg-green-600 px-4 py-2 rounded text-sm">
                          Mark Shipped 🚚
                        </button>
                        <button onClick={() => archive(sid)} className="bg-yellow-600 px-4 py-2 rounded text-sm">
                          Archive 🗂
                        </button>
                      </>
                    )}

                    {tab === "shipped" && (
                      <>
                        <button
                          onClick={() => openRefund(o)}
                          className="bg-indigo-600 px-4 py-2 rounded text-sm disabled:opacity-60"
                          disabled={refundableCents <= 0}
                          title={
                            refundableCents <= 0
                              ? "Nothing left to refund"
                              : `Refund up to $${(refundableCents / 100).toFixed(2)}`
                          }
                        >
                          Refund 💳
                        </button>
                        <button onClick={() => markDelivered(sid)} className="bg-blue-600 px-4 py-2 rounded text-sm">
                          Delivered 📬
                        </button>
                        <button onClick={() => archive(sid)} className="bg-yellow-600 px-4 py-2 rounded text-sm">
                          Archive 🗂
                        </button>
                      </>
                    )}

                    {tab === "delivered" && (
                      <>
                        <button onClick={() => archive(sid)} className="bg-yellow-600 px-4 py-2 rounded text-sm">
                        Archive 🗂
                        </button>
                      </>
                    )}

                    {tab === "archived" && (
                      <>
                        <button onClick={() => restore(sid)} className="bg-yellow-600 px-4 py-2 rounded text-sm">
                          Restore ♻️
                        </button>
                      </>
                    )}

                    {/* 🗑 Force Delete for orphans (no stripeSessionId but has _id) */}
                    {!sid && o._id && (
                      <button
                        onClick={() => forceDeleteOrder({ mongoId: o._id, note: "orphan (no stripeSessionId)" })}
                        className="bg-red-600 px-4 py-2 rounded text-sm"
                        title="Permanently remove this orphan order"
                      >
                        Force Delete 🗑
                      </button>
                    )}

                    {/* Optional: allow delete of ARCHIVED orders even if they have a session id */}
                    {sid && o.archived && (
                      <button
                        onClick={() => forceDeleteOrder({ sessionId: sid, note: "archived-delete from admin UI" })}
                        className="bg-red-700 px-4 py-2 rounded text-sm"
                        title="Permanently delete archived order (backed up first)"
                      >
                        Delete (Archived) 🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* pagination */}
      {!(tab === "custom" || tab === "logs") && totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${
                page === i + 1 ? "bg-blue-600" : "bg-[var(--bg-nav)] hover:bg-blue-500"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => (window.location.href = "/")} className="mt-8 text-sm text-red-300 underline">
        Exit Admin Panel 🔒
      </button>

      {/* refund modal */}
      {refundTarget && (
        <RefundDialog
          orderId={refundTarget.sessionId}
          sessionId={refundTarget.sessionId}
          maxCents={refundTarget.maxCents}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => {
            setRefundTarget(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
