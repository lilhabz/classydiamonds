// 📂 pages/account/orders.tsx – Show Ring Size, Safe Prices, Order Date, Safe Thumbnails 💎

import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import Breadcrumbs from "@/components/Breadcrumbs";

const ORDERS_PER_PAGE = 5;
const PLACEHOLDER = "/gray-placeholder.jpg"; // ensure this exists in /public

// ---- helpers ----
const toNum = (v: any): number => {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    // strip $ and commas etc.
    const n = parseFloat(v.replace(/[^\d.-]/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
};

const fmt = (n: number, currency?: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "USD").toUpperCase(),
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(toNum(n));

const fmtDate = (d: any) => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.valueOf())
    ? t.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "—";
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: { destination: "/auth", permanent: false },
    };
  }

  const client = await clientPromise;
  const db = client.db();

  const page = parseInt((context.query.page as string) || "1", 10);
  const shippedFilter = context.query.shipped;
  const skip = (page - 1) * ORDERS_PER_PAGE;

  const filter: any = { customerEmail: session.user?.email };
  if (shippedFilter === "true") filter.shipped = true;
  if (shippedFilter === "false") filter.shipped = false;

  const totalOrders = await db.collection("orders").countDocuments(filter);
  const orders = await db
    .collection("orders")
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(ORDERS_PER_PAGE)
    .toArray();

  const user = await db.collection("users").findOne(
    { email: session.user.email },
    {
      projection: {
        _id: 0,
        name: 1,
        email: 1,
        phone: 1,
        address: 1,
        city: 1,
        state: 1,
        zip: 1,
        country: 1,
      },
    }
  );

  return {
    props: {
      user: JSON.parse(JSON.stringify(user)),
      orders: JSON.parse(JSON.stringify(orders)),
      currentPage: page,
      totalPages: Math.ceil(totalOrders / ORDERS_PER_PAGE),
      shippedFilter: shippedFilter || null,
    },
  };
};

export default function OrdersPage({
  user,
  orders,
  currentPage,
  totalPages,
  shippedFilter,
}: any) {
  const router = useRouter();

  const handleFilterChange = (value: string) => {
    router.push({
      pathname: "/account/orders",
      query: { page: 1, shipped: value },
    });
  };

  return (
    <div className="bg-[var(--bg-page)] text-[var(--foreground)] min-h-screen px-4 py-10">
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mb-6 -mt-2">
        <Breadcrumbs customLabels={{ account: "Account", orders: "Order History" }} />
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-center">
          {user?.name?.split(" ")[0] || "Your"} Orders 📦
        </h1>

        {/* 🔍 Filters */}
        <div className="flex justify-center gap-4">
          {["", "false", "true"].map((val) => {
            const label = val === "" ? "All" : val === "false" ? "Processing" : "Shipped";
            const active = shippedFilter === val || (!shippedFilter && val === "");
            return (
              <button
                key={val}
                onClick={() => handleFilterChange(val)}
                className={`px-4 py-1 rounded ${
                  active
                    ? "bg-[var(--foreground)] text-[var(--bg-nav)]"
                    : "bg-[var(--bg-nav)] hover:bg-[var(--foreground)] text-[var(--foreground)]"
                } cursor-pointer`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {orders.length === 0 ? (
          <p className="text-gray-400 text-center">No orders found.</p>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => {
              const currency = (order?.currency || "USD").toUpperCase();
              const created = fmtDate(order?.createdAt);

              return (
                <div
                  key={order._id}
                  className="border border-[var(--bg-nav)] rounded-lg p-4 bg-[var(--bg-nav)]"
                >
                  {/* ─── Header ─── */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <p className="text-sm text-[#cfd2d6]">
                      🔢 Order #: {order.orderNumber ?? "N/A"} | 🆔{" "}
                      {order.stripeSessionId ? String(order.stripeSessionId).slice(-8) : "N/A"}
                    </p>

                    {/* Placed on date */}
                    <p className="text-sm text-[#cfd2d6]">
                      Placed on: <span className="font-medium text-[var(--foreground)]">{created}</span>
                    </p>

                    <p className="text-sm text-[#cfd2d6]">
                      Total: <span className="font-semibold">{fmt(order.amount ?? 0, currency)}</span>{" "}
                      <span className="opacity-70">{currency}</span>
                    </p>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${
                        order.delivered
                          ? "bg-blue-500 text-[var(--bg-page)]"
                          : order.shipped
                          ? "bg-green-500 text-[var(--bg-page)]"
                          : "bg-yellow-500 text-black"
                      }`}
                    >
                      {order.delivered ? "Delivered" : order.shipped ? "Shipped" : "Processing"}
                    </span>
                  </div>

                  {/* ─── Shipping Address ─── */}
                  {order.shipping_address && (
                    <div className="mt-4 text-sm text-[#cfd2d6]">
                      <p className="font-medium text-[var(--foreground)]">Shipping Address:</p>
                      <p>
                        {order.shipping_address.street}
                        {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""}
                        , {order.shipping_address.city}, {order.shipping_address.state}{" "}
                        {order.shipping_address.zip}, {order.shipping_address.country}
                      </p>
                    </div>
                  )}

                  {/* ─── Items ─── */}
                  <div className="mt-4 text-sm text-[#cfd2d6]">
                    <p className="font-medium text-[var(--foreground)] mb-2">Items:</p>
                    <ul className="space-y-3">
                      {order.items?.map((item: any, idx: number) => {
                        // ring size (or generic size)
                        const sizeValue =
                          item?.size ?? item?.ringSize ?? item?.variant?.size ?? null;

                        // image
                        const thumb =
                          (typeof item?.image === "string" && item.image.trim()) || PLACEHOLDER;

                        // pricing (robust to strings/$)
                        const qty = Math.max(1, toNum(item?.quantity) || 1);
                        const originalUnit = toNum(
                          item?.originalPrice ?? item?.price ?? item?.unitPrice ?? 0
                        );
                        const saleUnitRaw =
                          item?.salePrice ?? item?.discountedPrice ?? undefined;
                        const hasSale = saleUnitRaw !== undefined;
                        const saleUnit = toNum(saleUnitRaw);
                        const useSale = hasSale && saleUnit < originalUnit;

                        const unit = useSale ? saleUnit : (originalUnit || toNum(item?.price));
                        const subTotal = unit * qty;
                        const wasSubTotal = originalUnit * qty;

                        return (
                          <li key={idx} className="flex items-center gap-4">
                            <Image
                              src={thumb}
                              alt={item?.name || "Item"}
                              width={48}
                              height={48}
                              className="rounded object-cover"
                            />
                            <div>
                              <p className="font-medium text-[var(--foreground)]">
                                {item?.name || "Item"}
                              </p>

                              {/* size */}
                              {sizeValue && (
                                <p className="text-xs text-gray-300">
                                  Size: <span className="font-medium">{String(sizeValue)}</span>
                                </p>
                              )}

                              {/* price lines */}
                              {useSale ? (
                                <p className="text-sm text-[#cfd2d6]">
                                  x{qty} — {fmt(unit, currency)} ea •{" "}
                                  <span className="line-through text-gray-400 mr-1">
                                    {fmt(wasSubTotal, currency)}
                                  </span>
                                  <span className="text-green-400 font-semibold">
                                    {fmt(subTotal, currency)}
                                  </span>
                                </p>
                              ) : (
                                <p className="text-sm text-[#cfd2d6]">
                                  x{qty} — {fmt(unit, currency)} ea •{" "}
                                  <span className="font-semibold">{fmt(subTotal, currency)}</span>
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* ─── Receipt Download ─── */}
                  <div className="text-right mt-4">
                    <button className="text-[var(--foreground)] hover:underline text-sm">
                      Download Receipt (PDF)
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ─── Pagination ─── */}
            <div className="flex justify-center items-center gap-6 pt-6">
              {currentPage > 1 && (
                <Link
                  href={`/account/orders?page=${currentPage - 1}${
                    shippedFilter ? `&shipped=${shippedFilter}` : ""
                  }`}
                  className="text-[var(--foreground)] hover:underline text-sm"
                >
                  ← Previous
                </Link>
              )}
              <span className="text-sm text-[#cfd2d6]">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/account/orders?page=${currentPage + 1}${
                    shippedFilter ? `&shipped=${shippedFilter}` : ""
                  }`}
                  className="text-[var(--foreground)] hover:underline text-sm"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ─── Back Link ─── */}
        <div className="text-center mt-10">
          <Link href="/account" className="inline-block text-[var(--foreground)] hover:underline text-sm">
            ← Back to Account Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
