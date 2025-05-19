// 📄 pages/account/orders.tsx – Full Order History Page 💎

import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";

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
  const orders = await db
    .collection("orders")
    .find({ customerEmail: session.user?.email })
    .sort({ createdAt: -1 })
    .toArray();

  return {
    props: {
      session,
      orders: JSON.parse(JSON.stringify(orders)),
    },
  };
};

export default function OrdersPage({ orders }: any) {
  return (
    <div className="bg-[#1f2a36] text-white min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-center">Your Orders 📦</h1>

        {orders.length === 0 ? (
          <p className="text-gray-400 text-center">No orders found.</p>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => (
              <div
                key={order._id}
                className="border border-gray-600 rounded-lg p-4 bg-[#2a374f]"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <div>
                    <p className="text-sm text-gray-400">Order ID:</p>
                    <p className="text-sm font-semibold break-all">
                      {order.stripeSessionId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total:</p>
                    <p className="text-sm font-semibold">
                      ${order.amount?.toFixed(2)}{" "}
                      {order.currency?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status:</p>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full inline-block ${
                        order.shipped
                          ? "bg-green-500 text-white"
                          : "bg-yellow-500 text-black"
                      }`}
                    >
                      {order.shipped ? "Shipped" : "Processing"}
                    </span>
                  </div>
                </div>

                {order.address && (
                  <div className="mt-4 text-sm text-gray-300">
                    <p className="font-medium text-white">Shipping Address:</p>
                    <p>
                      {order.address.street}, {order.address.city},{" "}
                      {order.address.state} {order.address.zip},{" "}
                      {order.address.country}
                    </p>
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-300">
                  <p className="font-medium text-white mb-2">Items:</p>
                  <ul className="list-disc list-inside">
                    {order.items?.map((item: any, idx: number) => (
                      <li key={idx}>
                        {item.name} x{item.quantity} – $
                        {item.price * item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            href="/account"
            className="inline-block text-blue-400 hover:underline text-sm"
          >
            ← Back to Account Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
