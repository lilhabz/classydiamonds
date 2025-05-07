// 📂 pages/api/admin/archive.ts – Archive or Restore + Admin Log 🗂♻️📝

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId, restore } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // 🛠 Update archive state
    const update = restore
      ? { $set: { archived: false }, $unset: { archivedAt: "" } }
      : { $set: { archived: true, archivedAt: new Date() } };

    const result = await db
      .collection("orders")
      .updateOne({ stripeSessionId: orderId }, update);

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "Order not found or already in desired state" });
    }

    // 📝 Log action to adminLogs collection
    await db.collection("adminLogs").insertOne({
      orderId,
      action: restore ? "restore" : "archive",
      timestamp: new Date(),
      performedBy: "admin", // ✅ Replace with real user ID/email if using Auth later
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Failed to update archive state:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
