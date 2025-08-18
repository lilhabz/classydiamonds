import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface Order {
  _id: string;
  customerName?: string;
  customerEmail?: string;
  items?: any[];
  amount?: number | string;
  createdAt?: string;
  refundedAt?: string;
  refundReason?: string;
  orderNumber?: number;
  status?: "pending" | "shipped" | "refunded" | "archived";
}

export default function RefundedOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.isAdmin) fetchOrders();
  }, [session]);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const refunded = orders.filter((o) => {
    const st = o.status || "pending";
    return st === "refunded";
  });

  if (status === "loading") return <div className="p-6">Checking access...</div>;
  if (!session?.user?.isAdmin)
    return <div className="p-6 text-red-300 font-semibold">❌ Unauthorized</div>;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Refunded Orders | Classy Diamonds</title>
      </Head>
      <Breadcrumbs />
      <h1 className="text-3xl font-serif font-bold mb-6">🛠️ Admin Dashboard</h1>

      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
        <Link href="/admin" className="hover:text-yellow-300">
          📦 Orders
        </Link>
        <Link href="/admin/completed" className="hover:text-yellow-300">
          ✅ Shipped
        </Link>
        <Link href="/admin/refunded" className="text-yellow-400">
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
        <Link href="/admin/logs" className="hover:text-yellow-300">
          📝 Logs
        </Link>
      </nav>

      {loading ? (
        <p>Loading refunded orders...</p>
      ) : refunded.length === 0 ? (
        <p>No refunded orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg-nav)] text-left">
              <tr>
                <th className="px-4 py-2">Order #</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Refunded At</th>
                <th className="px-4 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {refunded.map((o) => (
                <tr key={o._id} className="border-b border-[var(--bg-nav)]">
                  <td className="px-4 py-2">{o.orderNumber ?? "N/A"}</td>
                  <td className="px-4 py-2">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">{o.customerName || o.customerEmail}</td>
                  <td className="px-4 py-2">{o.items ? o.items.length : 0}</td>
                  <td className="px-4 py-2">{typeof o.amount === "number" ? `$${o.amount.toFixed(2)}` : o.amount}</td>
                  <td className="px-4 py-2">
                    {o.refundedAt ? new Date(o.refundedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">{o.refundReason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
