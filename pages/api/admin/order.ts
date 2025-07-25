// 📂 pages/api/admin/order.ts – Return single order details by orderId (including discounts)
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | {
        orderNumber: number | null;
        items: Array<{
          name: string;
          quantity: number;
          price: number;
          discountedPrice?: number;
        }>;
        amount: number;
        currency: string;
        paymentStatus: string;
        customerAddress: string;
        address: any;
        createdAt: string;
        shipped: boolean;
        archived: boolean;
        shipping_address_string: string;
      }
    | { error: string }
  >
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== "string") {
    return res.status(400).json({ error: "Missing or invalid orderId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const o = await db
      .collection("orders")
      .findOne({ stripeSessionId: orderId });

    if (!o) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items =
      (o.items || []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.originalPrice, // original price
        discountedPrice: i.salePrice !== undefined ? i.salePrice : undefined, // sale price if any
      })) || [];

    return res.status(200).json({
      orderNumber: o.orderNumber ?? null,
      items,
      amount: o.amount,
      currency: o.currency || "usd",
      paymentStatus: o.paymentStatus || "",
      customerAddress: o.customerAddress || "",
      address: o.address || {},
      createdAt:
        o.createdAt instanceof Date
          ? o.createdAt.toISOString()
          : new Date(o.createdAt).toISOString(),
      shipped: o.shipped ?? false,
      archived: o.archived ?? false,
      shipping_address_string: o.shipping_address_string || "",
    });
  } catch (err: any) {
    console.error("❌ Failed to fetch order:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
