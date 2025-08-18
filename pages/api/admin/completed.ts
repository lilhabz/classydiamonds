// 📂 pages/api/admin/completed.ts – Get shipped (but not yet delivered) orders + Size Support ✅
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

type OrderStatus = "pending" | "shipped" | "refunded" | "archived";

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

    const rawOrders = await db
      .collection("orders")
      .find({
        $or: [
          { status: "shipped" },
          { status: { $exists: false }, shipped: true },
        ],
        delivered: { $ne: true },
      })
      .sort({ shippedAt: -1 })
      .toArray();

    const orders = rawOrders.map((o: any) => {
      const status: OrderStatus =
        o.status ||
        (o.shippedAt || o.shipped
          ? "shipped"
          : o.archived
          ? "archived"
          : "pending");
      return {
        _id: o._id.toString(),
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerAddress: o.customerAddress,
        shipping_address_string: o.shipping_address_string,
        amount: o.amount,
        currency: o.currency || "usd",
        paymentStatus: o.paymentStatus || "",
        createdAt: o.createdAt,
        shipped: o.shipped ?? false,
        shippedAt: o.shippedAt,
        delivered: o.delivered ?? false,
        archived: o.archived ?? false,
        orderNumber: o.orderNumber,
        stripeSessionId: o.stripeSessionId,
        trackingNumber: o.trackingNumber,
        carrier: o.carrier,
        trackingEmailSentAt: o.trackingEmailSentAt,
        status,
        refundedAt: o.refundedAt ? new Date(o.refundedAt).toISOString() : undefined,
        refundReason: o.refundReason,

        items: (o.items || []).map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.originalPrice,
          discountedPrice: i.salePrice !== undefined ? i.salePrice : undefined,
          image: i.image || "",
          size: i.size || undefined, // 🆕 include size
        })),
      };
    });

    return res.status(200).json({ orders });
  } catch (err: any) {
    console.error("❌ Failed to fetch completed orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
