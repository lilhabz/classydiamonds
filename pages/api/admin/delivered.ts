// 📂 pages/api/admin/delivered.ts – Get delivered orders 📬 (size-aware)

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
    const client = await clientPromise;
    const db = client.db();

    // 🔎 Fetch orders marked as delivered, newest first
    const rawOrders = await db
      .collection("orders")
      .find({ delivered: true })
      .sort({ deliveredAt: -1 })
      .toArray();

    // 🔄 Remap each order’s items to expose both prices + image + size
    const orders = rawOrders.map((o: any) => ({
      _id: o._id.toString(),
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerAddress: o.customerAddress,
      shipping_address_string: o.shipping_address_string,
      amount: o.amount,
      currency: o.currency || "usd",
      paymentStatus: o.paymentStatus || "",
      createdAt: o.createdAt,
      delivered: o.delivered ?? false,
      deliveredAt: o.deliveredAt,
      archived: o.archived ?? false,
      orderNumber: o.orderNumber,
      stripeSessionId: o.stripeSessionId,
      trackingNumber: o.trackingNumber,
      carrier: o.carrier,
      trackingEmailSentAt: o.trackingEmailSentAt,

      items: (o.items || []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.originalPrice, // original price
        discountedPrice: i.salePrice !== undefined ? i.salePrice : undefined, // sale price if discounted
        image: i.image || "", // ✅ include image
        size: i.size || undefined, // 🆕 include size
      })),
    }));

    // ✅ Return the mapped array
    return res.status(200).json({ orders });
  } catch (err: any) {
    console.error("❌ Failed to fetch delivered orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
