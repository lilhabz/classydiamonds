// 📂 pages/api/admin/order.ts – Return single order details by orderId (now including orderNumber) 🔄

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId } = req.query;

  if (!orderId || typeof orderId !== "string") {
    return res.status(400).json({ error: "Missing or invalid orderId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const order = await db
      .collection("orders")
      .findOne({ stripeSessionId: orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // ✅ Return all necessary fields, including the short orderNumber
    return res.status(200).json({
      orderNumber: order.orderNumber || null, // 🆕 Human-friendly order number
      items: order.items || [],
      amount: order.amount,
      customerAddress: order.customerAddress || "",
      createdAt: order.createdAt || "",
    });
  } catch (err) {
    console.error("❌ Failed to fetch order:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
