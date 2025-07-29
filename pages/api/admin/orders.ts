// 📂 pages/api/admin/orders.ts – Admin Orders API with Address Source Indicator 💎
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

interface RawOrder {
  _id: ObjectId;
  customerName: string;
  customerEmail: string;
  customerAddress: string;

  // One-line string
  shipping_address_string?: string;

  // Structured from Stripe webhook
  shipping_address?: {
    street?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  // Legacy from Account Edit
  address?: {
    street?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  items?: Array<{
    name: string;
    quantity: number;
    originalPrice: number;
    salePrice?: number;
    image?: string;
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

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  discountedPrice?: number;
  image?: string;
}

interface Order {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;

  shipping_address: {
    street?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;

  shipping_address_string: string;

  addressSource: "Stripe" | "Account" | "Unknown";

  items: OrderItem[];
  amount: number;
  currency: string;
  paymentStatus: string;
  createdAt: string;
  stripeSessionId: string;
  orderNumber: number | null;
  shipped: boolean;
  archived: boolean;
}

type OrdersResponse = {
  orders: Order[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrdersResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ orders: [], error: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const raw = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    const rawOrders = raw as unknown as RawOrder[];

    const orders: Order[] = rawOrders.map((o) => {
      let addressSource: "Stripe" | "Account" | "Unknown" = "Unknown";

      // Determine address priority
      const shippingObj = o.shipping_address || o.address || null;

      if (o.shipping_address && o.shipping_address.street) {
        addressSource = "Stripe";
      } else if (o.address && o.address.street) {
        addressSource = "Account";
      }

      // Build fallback string if missing
      const shippingString =
        o.shipping_address_string ||
        (shippingObj
          ? [
              shippingObj.street,
              shippingObj.line2,
              shippingObj.city,
              shippingObj.state && shippingObj.zip
                ? `${shippingObj.state} ${shippingObj.zip}`
                : shippingObj.zip,
              shippingObj.country,
            ]
              .filter(Boolean)
              .join(", ")
          : "");

      return {
        _id: o._id.toHexString(),
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerAddress: o.customerAddress,
        shipping_address: shippingObj,
        shipping_address_string: shippingString,
        addressSource, // <-- New field
        items: (o.items ?? []).map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.originalPrice,
          discountedPrice: i.salePrice,
          image: i.image,
        })),
        amount: o.amount,
        currency: o.currency || "usd",
        paymentStatus: o.paymentStatus || "",
        createdAt: o.createdAt.toISOString(),
        stripeSessionId: o.stripeSessionId,
        orderNumber: o.orderNumber ?? null,
        shipped: o.shipped ?? false,
        archived: o.archived ?? false,
      };
    });

    return res.status(200).json({ orders });
  } catch (err: any) {
    console.error("❌ Failed to fetch orders:", err);
    return res.status(500).json({ orders: [], error: "Server error" });
  }
}
