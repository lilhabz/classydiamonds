// 📂 pages/api/admin/order.ts – Return single order details by orderId (including full address) 🔄

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

  // 🔍 Extract orderId (Stripe Session ID) from query
  const { orderId } = req.query;
  if (!orderId || typeof orderId !== "string") {
    return res.status(400).json({ error: "Missing or invalid orderId" });
  }

  try {
    // 🔗 Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();

    // 🔎 Find the order by stripeSessionId
    const order = await db
      .collection("orders")
      .findOne({ stripeSessionId: orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // ✅ Return all necessary fields, including:
    //    - orderNumber (short human-friendly ID)
    //    - items, amount, currency, paymentStatus
    //    - customerAddress (one-line string)
    //    - address (structured sub-object)
    //    - createdAt, shipped, archived flags
    return res.status(200).json({
      orderNumber: order.orderNumber || null, // 🆕 Human-friendly order number
      items: order.items || [], // 📦 Line-item details
      amount: order.amount, // 💲 Total amount
      currency: order.currency || "usd", // 🏷 Currency code
      paymentStatus: order.paymentStatus || "", // ✅/❌ paid status
      customerAddress: order.customerAddress || "", // 🏠 One-line address
      address: order.address || {}, // 🧩 Structured: { street, line2, city, state, zip, country }
      createdAt: order.createdAt || "", // 📅 Timestamp
      shipped: order.shipped || false, // 🚚 Shipped flag
      archived: order.archived || false, // 🗄 Archived flag
    });
  } catch (err) {
    console.error("❌ Failed to fetch order:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
