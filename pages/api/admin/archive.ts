// 📂 pages/api/admin/archive.ts – Archive Handler 🗂

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("orders")
      .updateOne(
        { stripeSessionId: orderId },
        { $set: { archived: true, archivedAt: new Date() } }
      );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "Order not found or already archived" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Failed to archive order:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
