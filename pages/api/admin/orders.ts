// 📂 pages/api/admin/orders.ts – Return all orders for Admin Dashboard (including full address) 📦

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 🚫 Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🔗 Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();

    // 📦 Fetch ALL orders, sorted newest first (by createdAt, then fallback to _id)
    const orders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    // ✅ Return the full array of orders; each document already has:
    //    - orderNumber, items, amount, currency, paymentStatus
    //    - customerAddress (one-line) and address (sub-object)
    //    - createdAt, shipped, archived flags
    return res.status(200).json({ orders });
  } catch (err) {
    console.error("❌ Failed to fetch all orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
