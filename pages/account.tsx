// 📄 pages/account.tsx – Account Page 💎 + Full Profile Display + Collapsible Orders/Messages + Mobile/Desktop Safe

import { useSession, signOut } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Breadcrumbs from "@/components/Breadcrumbs";

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

  const orders = await db
    .collection("orders")
    .find({ customerEmail: session.user?.email })
    .sort({ createdAt: -1 })
    .toArray();

  return {
    props: {
      user: JSON.parse(JSON.stringify(user)),
      orders: JSON.parse(JSON.stringify(orders)),
    },
  };
};

export default function AccountPage({ user, orders }: any) {
  const { data: session } = useSession();
  const router = useRouter();

  const fullName = user?.name ?? "User";
  const firstName = fullName?.split(" ")[0];
  const email = user?.email ?? "Not available";

  const [messages, setMessages] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch("/api/account/messages");
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("❌ Failed to load messages:", err);
      }
    };
    fetchMessages();
  }, []);

  return (
    <div className="bg-[var(--bg-page)] text-[var(--foreground)] min-h-screen px-4 py-10">
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mb-6 -mt-2">
        <Breadcrumbs />
      </div>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* 👤 Profile Info */}
        <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-2 text-center">
            Welcome 👋 {firstName}
          </h2>

          <div className="text-center mb-6">
            <p className="text-sm text-gray-300">{email}</p>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition mt-4"
            >
              Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <span className="text-white font-medium">Phone:</span>{" "}
              {user?.phone || "Not provided"}
            </div>
            <div>
              <span className="text-white font-medium">Address:</span>{" "}
              {user?.address || "Not provided"}
            </div>
            <div>
              <span className="text-white font-medium">City:</span>{" "}
              {user?.city || "Not provided"}
            </div>
            <div>
              <span className="text-white font-medium">State:</span>{" "}
              {user?.state || "Not provided"}
            </div>
            <div>
              <span className="text-white font-medium">ZIP Code:</span>{" "}
              {user?.zip || "Not provided"}
            </div>
            <div>
              <span className="text-white font-medium">Country:</span>{" "}
              {user?.country || "Not provided"}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <button
              onClick={() => router.push("/account/edit")}
              className="w-full bg-[var(--bg-nav)] hover:bg-[#364763] rounded-lg px-4 py-3 text-left"
            >
              ✏️ Edit Profile Info
            </button>
            <button
              onClick={() => router.push("/account/password")}
              className="w-full bg-[#2a374f] hover:bg-[#364763] rounded-lg px-4 py-3 text-left"
            >
              🔑 Change Password
            </button>
            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact?open=custom#custom-form"
                className="flex-1 block bg-[#2a374f] hover:bg-[#364763] rounded-lg px-4 py-3 text-left"
              >
                💍 Start a Custom Jewelry Request
              </Link>
              <Link
                href="/contact?open=message#message-form"
                className="flex-1 block bg-[#2a374f] hover:bg-[#364763] rounded-lg px-4 py-3 text-left"
              >
                📨 Submit a Message
              </Link>
            </div>
          </div>
        </div>

        {/* 📦 Recent Orders (Collapsible) */}
        <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Recent Orders 📦</h3>
            <button
              onClick={() => setShowOrders(!showOrders)}
              className="text-sm text-blue-400 hover:underline"
            >
              {showOrders ? "Hide" : "Show"} Orders
            </button>
          </div>
          {showOrders && (
            <>
              {orders.length === 0 ? (
                <p className="text-gray-400">
                  You haven't placed any orders yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {orders.slice(0, 3).map((order: any) => (
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
                  <div className="text-right pt-2">
                    <Link
                      href="/account/orders"
                      className="text-sm text-blue-400 hover:underline"
                    >
                      View All Orders →
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 💬 Messages (Collapsible) */}
        <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Your Messages 💬</h3>
            <button
              onClick={() => setShowMessages(!showMessages)}
              className="text-sm text-blue-400 hover:underline"
            >
              {showMessages ? "Hide" : "Show"} Messages
            </button>
          </div>
          {showMessages && (
            <>
              {messages.length === 0 ? (
                <p className="text-gray-400">
                  You haven’t submitted any messages or requests yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {messages.slice(0, 3).map((msg: any) => (
                    <div
                      key={msg._id}
                      className="border border-gray-600 rounded-lg p-4 bg-[#2a374f]"
                    >
                      <div className="text-sm">
                        <p className="text-gray-400 mb-1">
                          {msg.formCategory === "custom"
                            ? "🔧 Custom Request"
                            : "📨 Message"}{" "}
                          submitted on{" "}
                          {new Date(msg.submittedAt).toLocaleString()}
                        </p>
                        {msg.type && (
                          <p className="text-white">
                            <strong>Type:</strong> {msg.type}
                          </p>
                        )}
                        {msg.preference && (
                          <p className="text-white">
                            <strong>Preferred Contact:</strong> {msg.preference}
                          </p>
                        )}
                        {(msg.message || msg.customMessage) && (
                          <p className="text-white whitespace-pre-wrap mt-2">
                            {msg.message || msg.customMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="text-right pt-2">
                    <Link
                      href="/account/messages"
                      className="text-sm text-blue-400 hover:underline"
                    >
                      View All Messages →
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
