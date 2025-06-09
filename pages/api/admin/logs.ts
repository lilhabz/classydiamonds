// 📂 pages/api/admin/logs.ts – Get All Admin Action Logs 📝

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

    // Join with orders collection to fetch the human friendly order number
    const logs = await db
      .collection("adminLogs")
      .aggregate([
        { $sort: { timestamp: -1 } },
        {
          $lookup: {
            from: "orders",
            localField: "orderId",
            foreignField: "stripeSessionId",
            as: "order",
          },
        },
        { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            orderId: 1,
            action: 1,
            timestamp: 1,
            performedBy: 1,
            orderNumber: "$order.orderNumber",
          },
        },
      ])
      .toArray();

    return res.status(200).json({ logs });
  } catch (err) {
    console.error("❌ Failed to fetch admin logs:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
