// 📂 pages/account/orders.tsx – Breadcrumb Added + Fresh Data Upgrade + Short Order Number & Full Address Display 💎

import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import Breadcrumbs from "@/components/Breadcrumbs";

const ORDERS_PER_PAGE = 5;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
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
    .sort({ createdAt: -1, _id: -1 }) // ← newest first, fallback to _id
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
        <Breadcrumbs
          customLabels={{ account: "Account", orders: "Order History" }}
        />
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-center">
          {user?.name?.split(" ")[0] || "Your"} Orders 📦
        </h1>

        {/* 🔍 Filters */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleFilterChange("")}
            className={`px-4 py-1 rounded ${
              !shippedFilter
                ? "bg-[var(--foreground)] text-[var(--bg-nav)]"
                : "bg-[var(--bg-nav)] hover:bg-[var(--foreground)] text-[var(--foreground)]"
            } cursor-pointer`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange("false")}
            className={`px-4 py-1 rounded ${
              shippedFilter === "false"
                ? "bg-[var(--foreground)] text-[var(--bg-nav)]"
                : "bg-[var(--bg-nav)] hover:bg-[var(--foreground)] text-[var(--foreground)]"
            } cursor-pointer`}
          >
            Processing
          </button>
          <button
            onClick={() => handleFilterChange("true")}
            className={`px-4 py-1 rounded ${
              shippedFilter === "true"
                ? "bg-[var(--foreground)] text-[var(--bg-nav)]"
                : "bg-[var(--bg-nav)] hover:bg-[var(--foreground)] text-[var(--foreground)]"
            } cursor-pointer`}
          >
            Shipped
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="text-gray-400 text-center">No orders found.</p>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => (
              <div
                key={order._id}
                className="border border-[var(--bg-nav)] rounded-lg p-4 bg-[var(--bg-nav)]"
              >
                {/* ─── Order Header: Short Order #, Total, Status ─────────────────── */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <div>
                    <p className="text-sm text-[#cfd2d6]">Order #:</p>
                    <p className="text-sm font-semibold break-all">
                      #{order.orderNumber} {/* 🆕 Show short orderNumber */}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#cfd2d6]">Total:</p>
                    <p className="text-sm font-semibold">
                      ${order.amount?.toFixed(2)}{" "}
                      {order.currency?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#cfd2d6]">Status:</p>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${
                        order.shipped
                          ? "bg-green-500 text-[var(--bg-page)]"
                          : "bg-yellow-500 text-black"
                      }`}
                    >
                      {order.shipped ? "Shipped" : "Processing"}
                    </span>
                  </div>
                </div>

                {/* ─── Shipping Address ─────────────────────────────────────────────── */}
                {order.address && (
                  <div className="mt-4 text-sm text-[#cfd2d6]">
                    <p className="font-medium text-[var(--foreground)]">
                      Shipping Address:
                    </p>
                    <p>
                      {order.address.street}
                      {order.address.line2
                        ? `, ${order.address.line2}`
                        : ""}{" "}
                      {/* 🏠 Line 2 if present */}, {order.address.city},{" "}
                      {order.address.state} {order.address.zip},{" "}
                      {order.address.country}
                    </p>
                  </div>
                )}

                {/* ─── Itemized List ──────────────────────────────────────────────── */}
                <div className="mt-4 text-sm text-[#cfd2d6]">
                  <p className="font-medium text-[var(--foreground)] mb-2">
                    Items:
                  </p>
                  <ul className="space-y-3">
                    {order.items?.map((item: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-4">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="rounded object-cover"
                        />
                        <div>
                          <p className="font-medium text-[var(--foreground)]">
                            {item.name}
                          </p>
                          <p className="text-sm text-[#cfd2d6]">
                            x{item.quantity} – $
                            {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ─── Receipt Download (Placeholder) ───────────────────────────────── */}
                <div className="text-right mt-4">
                  <button className="text-[var(--foreground)] hover:underline text-sm">
                    Download Receipt (PDF)
                  </button>
                </div>
              </div>
            ))}

            {/* ─── Pagination Controls ──────────────────────────────────────────── */}
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

        {/* ─── Back to Account Dashboard ─────────────────────────────────────── */}
        <div className="text-center mt-10">
          <Link
            href="/account"
            className="inline-block text-[var(--foreground)] hover:underline text-sm"
          >
            ← Back to Account Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
