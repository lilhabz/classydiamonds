// 📂 pages/admin/shipped-confirmation.tsx

import Link from "next/link";
import Head from "next/head";

export default function ShippedConfirmation() {
  return (
    <div className="min-h-screen bg-[#1f2a44] text-white flex flex-col justify-center items-center text-center p-6">
      <Head>
        <title>Shipping Confirmed | Classy Diamonds</title>
      </Head>

      <div className="bg-[#25304f] p-10 rounded-xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4">🎉 Shipping Email Sent</h1>
        <p className="text-lg mb-6">
          The customer has been notified and the order is now marked as shipped.
        </p>
        <Link
          href="/admin/orders"
          className="inline-block px-6 py-3 bg-white text-[#1f2a44] font-semibold rounded-full hover:bg-gray-100 transition hover:scale-105"
        >
          ⬅️ Back to Orders
        </Link>
      </div>
    </div>
  );
}
