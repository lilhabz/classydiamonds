// 📂 pages/api/admin/orders.ts – Return all orders for Admin Dashboard (including discounts)
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
  }>;
  amount: number;
  currency?: string;
  paymentStatus?: string;
  createdAt: Date;
  stripeSessionId: string;
  orderNumber?: number;
  shipped?: boolean;
  archived?: boolean;
}

type OrderResponse = {
  orders?: {
    _id: string;
    customerName: string;
    customerEmail: string;
    customerAddress: string;
    shipping_address_string?: string;
    items: {
      name: string;
      quantity: number;
      price: number;
      discountedPrice?: number;
    }[];
    amount: number;
    currency: string;
    paymentStatus: string;
    createdAt: string;
    stripeSessionId: string;
    orderNumber: number | null;
    shipped: boolean;
    archived: boolean;
  }[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // now typed as RawOrder[], so o._id is ObjectId
    const rawOrders = await db
      .collection<RawOrder>("orders")
      .find({})
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    const orders = rawOrders.map((o) => ({
      _id: o._id.toHexString(), // use toHexString() on ObjectId
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerAddress: o.customerAddress,
      shipping_address_string: o.shipping_address_string,
      items: (o.items ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.originalPrice,
        discountedPrice: i.salePrice,
      })),
      amount: o.amount,
      currency: o.currency ?? "usd",
      paymentStatus: o.paymentStatus ?? "",
      createdAt: o.createdAt.toISOString(),
      stripeSessionId: o.stripeSessionId,
      orderNumber: o.orderNumber ?? null,
      shipped: o.shipped ?? false,
      archived: o.archived ?? false,
    }));

    return res.status(200).json({ orders });
  } catch (err: any) {
    console.error("❌ Failed to fetch all orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
