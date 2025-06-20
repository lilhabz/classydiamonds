// 📄 pages/account/messages.tsx – View All Messages Page 💬 + Pagination + Layout Match

import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import clientPromise from "@/lib/mongodb";
import { useState } from "react";
import Link from "next/link";
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
  const allMessages = await db
    .collection("messages")
    .find({ email: session.user?.email })
    .sort({ submittedAt: -1 })
    .toArray();

  return {
    props: {
      session,
      messages: JSON.parse(JSON.stringify(allMessages)),
    },
  };
};

export default function AllMessagesPage({ messages }: any) {
  const [page, setPage] = useState(1);
  const perPage = 5;
  const totalPages = Math.ceil(messages.length / perPage);

  const currentMessages = messages.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-[var(--bg-page)] text-[var(--foreground)] min-h-screen px-4 py-10">
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mb-6 -mt-2">
        <Breadcrumbs />
      </div>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* 🧭 Page Title */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">All Messages & Requests 💬</h1>
          <Link
            href="/account"
            className="text-sm text-blue-400 hover:underline"
          >
            ← Back to Account
          </Link>
        </div>

        {/* 💬 Messages List */}
        {currentMessages.length === 0 ? (
          <p className="text-gray-400">
            You haven’t submitted any messages or requests yet.
          </p>
        ) : (
          <div className="space-y-6">
            {currentMessages.map((msg: any) => (
              <div
                key={msg._id}
                className="border border-gray-600 rounded-xl p-4 bg-[var(--bg-nav)]"
              >
                <div className="text-sm">
                  <p className="text-gray-400 mb-1">
                    {msg.formCategory === "custom"
                      ? "🔧 Custom Request"
                      : "📨 Message"}{" "}
                    submitted on {new Date(msg.submittedAt).toLocaleString()}
                  </p>
                  {msg.type && (
                    <p className="text-[var(--foreground)]">
                      <strong>Type:</strong> {msg.type}
                    </p>
                  )}
                  {msg.preference && (
                    <p className="text-[var(--foreground)]">
                      <strong>Preferred Contact:</strong> {msg.preference}
                    </p>
                  )}
                  {(msg.message || msg.customMessage) && (
                    <p className="text-[var(--foreground)] whitespace-pre-wrap mt-2">
                      {msg.message || msg.customMessage}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 📄 Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 pt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className={`px-4 py-2 rounded-lg ${
                page === 1
                  ? "bg-gray-700 cursor-not-allowed text-gray-400"
                  : "bg-[var(--bg-nav)] hover:bg-[var(--bg-nav)] text-[var(--foreground)]"
              }`}
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className={`px-4 py-2 rounded-lg ${
                page === totalPages
                  ? "bg-gray-700 cursor-not-allowed text-gray-400"
                  : "bg-[var(--bg-nav)] hover:bg-[var(--bg-nav)] text-[var(--foreground)]"
              }`}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
