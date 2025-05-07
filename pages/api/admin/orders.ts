// 📂 pages/api/admin/orders.ts – Return all orders for Admin Dashboard

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // 📦 Fetch ALL orders, sorted newest first
    const orders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ orders });
  } catch (err) {
    console.error("❌ Failed to fetch all orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
