// 📂 pages/api/admin/orders.ts – Admin Orders API with Address Source + Size 💎
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

interface RawOrder {
  _id: ObjectId;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;

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
    originalPrice?: number; // legacy/base price
    salePrice?: number; // discounted/sale price
    unitPrice?: number; // new flow (if present)
    price?: number; // some legacy docs might have this
    image?: string;
    size?: string;
  }>;

  amount?: number; // dollars
  currency?: string;
  paymentStatus?: string;
  createdAt?: Date;
  stripeSessionId?: string;
  orderNumber?: number;
  shipped?: boolean;
  archived?: boolean;
}

interface OrderItem {
  name: string;
  quantity: number;

  // Keep a rich shape so UIs can decide the display logic:
  price: number; // legacy/base price (alias of originalPrice when available)
  discountedPrice?: number; // alias of salePrice for older UIs
  salePrice?: number;
  unitPrice?: number;
  originalPrice?: number;

  image?: string;
  size?: string;
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

    // 🧹 Exclude "junk" orders that have NEITHER an orderNumber nor a usable stripeSessionId
    const raw = await db
      .collection("orders")
      .find({
        $or: [
          { orderNumber: { $exists: true, $ne: null } },
          { stripeSessionId: { $exists: true, $ne: "" } },
        ],
      })
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
                : shippingObj.state || shippingObj.zip,
              shippingObj.country,
            ]
              .filter(Boolean)
              .join(", ")
          : "");

      // 🧯 Sanitize "Stripe" name if it slipped into older docs
      const rawName = (o.customerName || "").trim();
      const cleanName =
        rawName && rawName.toLowerCase() !== "stripe"
          ? rawName
          : (o.customerEmail || "")
              .split("@")[0]
              ?.replace(/\./g, " ")
              ?.trim() || "Customer";

      const items: OrderItem[] = (o.items ?? []).map((i) => {
        const originalPrice =
          typeof i.originalPrice === "number"
            ? i.originalPrice
            : typeof i.price === "number"
            ? i.price
            : 0;

        const salePrice =
          typeof i.salePrice === "number" ? i.salePrice : undefined;

        const unitPrice =
          typeof i.unitPrice === "number"
            ? i.unitPrice
            : typeof salePrice === "number"
            ? salePrice
            : typeof originalPrice === "number"
            ? originalPrice
            : undefined;

        return {
          name: i.name,
          quantity: i.quantity,
          price: originalPrice, // legacy/base
          discountedPrice: salePrice, // keep alias for older UIs
          salePrice, // and the canonical sale field
          unitPrice,
          originalPrice,
          image: i.image || "",
          size: i.size,
        };
      });

      return {
        _id: o._id.toHexString(),
        customerName: cleanName,
        customerEmail: o.customerEmail || "",
        customerAddress: o.customerAddress || "",
        shipping_address: shippingObj,
        shipping_address_string: shippingString,
        addressSource,
        items,
        amount: typeof o.amount === "number" ? o.amount : 0,
        currency: o.currency || "usd",
        paymentStatus: o.paymentStatus || "",
        createdAt: o.createdAt
          ? o.createdAt.toISOString()
          : new Date(0).toISOString(),
        stripeSessionId: o.stripeSessionId || "",
        orderNumber: typeof o.orderNumber === "number" ? o.orderNumber : null,
        shipped: !!o.shipped,
        archived: !!o.archived,
      };
    });

    return res.status(200).json({ orders });
  } catch (err: any) {
    console.error("❌ Failed to fetch orders:", err);
    return res.status(500).json({ orders: [], error: "Server error" });
  }
}
