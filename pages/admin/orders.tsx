// ================================
// pages/admin/orders.tsx
// One-page admin with tabs that reuse AdminOrderCard
// ================================

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import AdminOrderCard, { AdminOrder, CardContext } from "@/components/AdminOrderCard";

const TABS = [
  { key: "orders", label: "📦 Orders" },
  { key: "shipped", label: "✅ Shipped" },
  { key: "delivered", label: "📬 Delivered" },
  { key: "archived", label: "🗂 Archived" },
] as const;

type TabKey = typeof TABS[number]["key"];

function isTab(v: string | string[] | undefined): v is TabKey {
  const s = typeof v === "string" ? v : v?.[0] || "";
  return TABS.some((t) => t.key === s);
}

export default function UnifiedOrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const tabParam = router.query.tab;
  const activeTab: TabKey = isTab(tabParam) ? (tabParam as TabKey) : "orders";

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]); // active/unshipped
  const [shipped, setShipped] = useState<AdminOrder[]>([]);
  const [delivered, setDelivered] = useState<AdminOrder[]>([]);
  const [archived, setArchived] = useState<AdminOrder[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const adminName =
    (session?.user as any)?.firstName ||
    (session?.user?.name ? session.user.name.split(" ")[0] : "Admin");

  const fetchAll = async () => {
    setLoading(true);
    try {
      // We reuse your existing endpoints (avoids changing /api/admin/orders shape)
      const [resAll, resShipped, resDelivered, resArchived] = await Promise.all([
        fetch("/api/admin/orders"),
        fetch("/api/admin/completed"),
        fetch("/api/admin/delivered"),
        fetch("/api/admin/archived"),
      ]);
      const [allJson, shipJson, delivJson, archJson] = await Promise.all([
        resAll.json(),
        resShipped.json(),
        resDelivered.json(),
        resArchived.json(),
      ]);

      const allOrders: AdminOrder[] = Array.isArray(allJson.orders)
        ? allJson.orders
        : [];

      // Active/unshipped for the first tab
      const active = allOrders.filter((o) => !o.shipped && !o.archived);

      setOrders(active);
      setShipped(Array.isArray(shipJson.orders) ? shipJson.orders : []);
      setDelivered(Array.isArray(delivJson.orders) ? delivJson.orders : []);
      setArchived(Array.isArray(archJson.orders) ? archJson.orders : []);
    } catch (e) {
      console.error("❌ Failed to fetch orders:", e);
      setOrders([]);
      setShipped([]);
      setDelivered([]);
      setArchived([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.isAdmin) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.isAdmin]);

  // Search + date filter per tab
  const source = activeTab === "orders" ? orders : activeTab === "shipped" ? shipped : activeTab === "delivered" ? delivered : archived;

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return (source || []).filter((o) => {
      const name = String(o.customerName || "").toLowerCase();
      const email = String(o.customerEmail || "").toLowerCase();
      const sess = String(o.stripeSessionId || "").toLowerCase();
      const matchQ = !q || name.includes(q) || email.includes(q) || sess.includes(q);

      // choose which timestamp to filter on per tab
      const ts =
        activeTab === "orders"
          ? o.createdAt
          : activeTab === "shipped"
          ? o.shippedAt
          : activeTab === "delivered"
          ? o.deliveredAt
          : o.archivedAt;
      const d = ts ? new Date(ts) : new Date(0);
      const after = start ? d >= start : true;
      const before = end ? d <= end : true;
      return matchQ && after && before;
    });
  }, [source, searchQuery, startDate, endDate, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const switchTab = (key: TabKey) => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    const url = { pathname: "/admin/orders", query: { tab: key } } as const;
    router.replace(url, undefined, { shallow: true });
  };

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return <div className="p-6 text-red-300 font-semibold">❌ Unauthorized</div>;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Admin Orders | Classy Diamonds</title>
      </Head>
      <Breadcrumbs />
      <h1 className="text-3xl font-serif font-bold mb-6">🛠 Unified Orders</h1>

      {/* Tabs */}
      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={
              "px-3 py-1 rounded " + (activeTab === t.key ? "text-yellow-400" : "hover:text-yellow-300")
            }
          >
            {t.label}
          </button>
        ))}
        {/* Keep your other admin links */}
        <Link href="/admin/products" className="hover:text-yellow-300">🛠 Products</Link>
        <Link href="/admin/custom-photos" className="hover:text-yellow-300">🖼 Custom</Link>
        <Link href="/admin/logs" className="hover:text-yellow-300">📝 Logs</Link>
      </nav>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search…"
          className="px-4 py-2 rounded bg-[var(--bg-nav)] text-white flex-1"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input type="date" className="px-2 py-1 rounded bg-[var(--bg-nav)] text-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="px-2 py-1 rounded bg-[var(--bg-nav)] text-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {/* Lists */}
      {loading ? (
        <p>Loading orders…</p>
      ) : pageData.length === 0 ? (
        <p>No matching orders found.</p>
      ) : (
        <div className="space-y-8">
          {pageData.map((o, idx) => (
            <AdminOrderCard key={(o._id || o.stripeSessionId || idx).toString()} order={o} context={activeTab as CardContext} adminName={adminName} onRefresh={fetchAll} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${currentPage === i + 1 ? "bg-blue-600" : "bg-[var(--bg-nav)] hover:bg-blue-500"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => (window.location.href = "/")} className="mt-8 text-sm text-red-300 underline">Exit Admin Panel 🔒</button>
    </div>
  );
}