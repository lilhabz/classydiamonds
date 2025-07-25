// 📂 pages/api/admin/orders.ts – Return all orders for Admin Dashboard (including full address + discounts)
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

    // 📦 Fetch ALL orders, sorted newest first
    const rawOrders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    // 🔄 Remap each order’s items:
    //   • price            ← originalPrice
    //   • discountedPrice  ← salePrice (if exists)
    const orders = rawOrders.map((o: any) => ({
      _id: o._id.toString(),
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerAddress: o.customerAddress,
      shipping_address_string: o.shipping_address_string,
      amount: o.amount,
      createdAt: o.createdAt, // Dates will serialize to ISO strings
      stripeSessionId: o.stripeSessionId,
      orderNumber: o.orderNumber,
      shipped: o.shipped,
      archived: o.archived,

      items: (o.items || []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.originalPrice, // original price
        discountedPrice:
          i.salePrice !== undefined // sale price, if discounted
            ? i.salePrice
            : undefined,
      })),
    }));

    // ✅ Return the mapped orders
    return res.status(200).json({ orders });
  } catch (err: any) {
    console.error("❌ Failed to fetch all orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
