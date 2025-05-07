// 📂 pages/api/admin/archived.ts – Get Archived Orders + Archive/Restore with Logging ♻️🗂

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db();

  if (req.method === "GET") {
    // ✅ Return archived orders
    try {
      const archivedOrders = await db
        .collection("orders")
        .find({ archived: true })
        .sort({ archivedAt: -1 })
        .toArray();

      return res.status(200).json({ orders: archivedOrders });
    } catch (err) {
      console.error("❌ Failed to fetch archived orders:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "POST") {
    const { orderId, restore } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    try {
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

      await db.collection("adminLogs").insertOne({
        orderId,
        action: restore ? "restore" : "archive",
        timestamp: new Date(),
        performedBy: "admin", // replace later with session.user.email
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ Failed to update archive state:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
