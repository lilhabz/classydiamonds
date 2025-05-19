// 📄 pages/account.tsx – Full E-Commerce Account Page 💎

import { GetServerSideProps } from "next";
import { getSession, signOut } from "next-auth/react";
import clientPromise from "@/lib/mongodb";

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

export default function AccountPage({ session, orders }: any) {
  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "Not available";

  return (
    <div className="bg-[#1f2a36] text-white min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* 👤 Profile Info */}
        <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome 👋</h2>
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-sm text-gray-300 mb-4">{email}</p>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>

        {/* 📦 Order History */}
        <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Order History 📦</h3>

          {orders.length === 0 ? (
            <p className="text-gray-400">You haven't placed any orders yet.</p>
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

                  {/* 📬 Address */}
                  {order.address && (
                    <div className="mt-4 text-sm text-gray-300">
                      <p className="font-medium text-white">
                        Shipping Address:
                      </p>
                      <p>
                        {order.address.street}, {order.address.city},{" "}
                        {order.address.state} {order.address.zip},{" "}
                        {order.address.country}
                      </p>
                    </div>
                  )}

                  {/* 📃 Items */}
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
        </div>
      </div>
    </div>
  );
}
