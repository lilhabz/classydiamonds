// 📂 pages/api/admin/order.ts – Return single order details by orderId (incl. size + discounts + image)
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

interface RawOrder {
  _id: ObjectId;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  shipping_address_string?: string;
  items?: Array<{
    name: string;
    quantity: number;
    originalPrice: number;
    salePrice?: number;
    image?: string;
    size?: string; // 🆕 ring size
  }>;
  amount: number;
  currency?: string;
  paymentStatus?: string;
  address?: {
    street?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  createdAt: Date;
  stripeSessionId: string;
  orderNumber?: number;
  shipped?: boolean;
  archived?: boolean;
}

type OrderResponse =
  | {
      orderNumber: number | null;
      items: {
        name: string;
        quantity: number;
        price: number; // original price
        discountedPrice?: number; // sale price if discounted
        image?: string;
        size?: string; // 🆕 ring size
      }[];
      amount: number;
      currency: string;
      paymentStatus: string;
      customerAddress: string;
      address: RawOrder["address"];
      createdAt: string;
      shipped: boolean;
      archived: boolean;
      shipping_address_string: string;
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderResponse>
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

    // Note: orderId here is the Stripe session id per your existing code
    const o = await db
      .collection<RawOrder>("orders")
      .findOne({ stripeSessionId: orderId });

    if (!o) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items =
      o.items?.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.originalPrice,
        discountedPrice: i.salePrice,
        image: i.image || "",
        size: i.size, // 🆕 include size in response
      })) || [];

    return res.status(200).json({
      orderNumber: o.orderNumber ?? null,
      items,
      amount: o.amount,
      currency: o.currency ?? "usd",
      paymentStatus: o.paymentStatus ?? "",
      customerAddress: o.customerAddress,
      address: o.address ?? {},
      createdAt: o.createdAt.toISOString(),
      shipped: o.shipped ?? false,
      archived: o.archived ?? false,
      shipping_address_string: o.shipping_address_string ?? "",
    });
  } catch (err: any) {
    console.error("❌ Failed to fetch order:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
