// 📄 pages/account.tsx – Account Page 💎 + Orders + Messages + Custom Requests + Navigation + Form Link Buttons

import { GetServerSideProps } from "next";
import { getSession, signOut } from "next-auth/react";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  // 🐛 DEBUG: Log session to server console
  console.log("💡 Server session:", session);

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
  const fullName = session?.user?.name ?? "User";
  const name = fullName?.split(" ")[0]; // 🪪 Get first name only
  const email = session?.user?.email ?? "Not available";
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  // 🐛 DEBUG: Log session to browser console
  useEffect(() => {
    console.log("🔍 Session debug:", session);
  }, [session]);

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
    <div className="bg-[#1f2a36] text-white min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* 👤 Profile Info */}
        <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-2 text-center">
            {/* ✅ Safely display first name or fallback */}
            Welcome 👋 {name || "User"}
          </h2>

          <div className="text-center">
            {/* ✅ Email from session or fallback */}
            <p className="text-sm text-gray-300 mb-6">
              {email || "Email not available"}
            </p>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>

          {/* 🔐 Profile Actions */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <button
              onClick={() => router.push("/account/edit")}
              className="w-full bg-[#2a374f] hover:bg-[#364763] rounded-lg px-4 py-3 text-left"
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

        {/* 📦 Recent Orders Preview */}
        <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Recent Orders 📦</h3>
            {orders.length > 3 && (
              <Link
                href="/account/orders"
                className="text-sm text-blue-400 hover:underline"
              >
                View All Orders →
              </Link>
            )}
          </div>

          {orders.length === 0 ? (
            <p className="text-gray-400">You haven't placed any orders yet.</p>
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

        {/* 📬 Messages + Custom Requests Section */}
        <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Your Messages 💬</h3>
            {messages.length > 3 && (
              <Link
                href="/account/messages"
                className="text-sm text-blue-400 hover:underline"
              >
                View All Messages →
              </Link>
            )}
          </div>

          {messages.length === 0 ? (
            <p className="text-gray-400">
              You haven’t submitted any messages or requests yet.
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg: any) => (
                <div
                  key={msg._id}
                  className="border border-gray-600 rounded-lg p-4 bg-[#2a374f]"
                >
                  <div className="text-sm">
                    <p className="text-gray-400 mb-1">
                      {msg.formCategory === "custom"
                        ? "🔧 Custom Request"
                        : "📨 Message"}{" "}
                      submitted on {new Date(msg.submittedAt).toLocaleString()}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
