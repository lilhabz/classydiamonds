// 📂 pages/api/admin/order.ts – Return single order details by orderId (Stripe session id)
// Compatible with both legacy (originalPrice/salePrice) and new (unitPrice) items

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

interface RawOrderItem {
  name: string;
  quantity: number;
  // legacy fields
  originalPrice?: number;
  salePrice?: number;
  discountedPrice?: number;
  price?: number;
  // new field from checkout.ts
  unitPrice?: number;
  image?: string;
  size?: string | null;
}

interface RefundEntry {
  refundId: string;
  amount: number; // cents
  reason?: string;
  note?: string;
  adminEmail?: string;
  createdAt: string;
  provider?: string; // "stripe" | "paypal"
  status?: string;
}

interface RawOrder {
  _id: any;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string; // string form
  shipping_address_string?: string; // string form
  address?: {
    // normalized shape (new)
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    // legacy shape
    street?: string;
    zip?: string;
  };
  items?: RawOrderItem[];
  amount?: number; // set in webhook
  saleTotal?: number; // set in checkout
  originalTotal?: number; // set in checkout
  currency?: string;
  paymentStatus?: string;
  createdAt?: Date | string;
  stripeSessionId: string;
  orderNumber?: number;
  shipped?: boolean;
  archived?: boolean;
  // refunds
  refundedTotal?: number;
  refunds?: RefundEntry[];
}

type OrderResponse =
  | {
      _id: string;
      stripeSessionId: string;
      orderNumber: number | null;
      items: {
        name: string;
        quantity: number;
        price: number; // unit price we display
        discountedPrice?: number; // sale price if you want to show both
        image?: string;
        size?: string | null;
      }[];
      amount: number;
      refundedTotal: number;
      refunds: RefundEntry[];
      currency: string;
      paymentStatus: string;
      customerAddress: string; // formatted string
      address: RawOrder["address"]; // raw object if you need it elsewhere
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

  const { orderId } = req.query; // this is Stripe session id in your app
  if (!orderId || typeof orderId !== "string") {
    return res.status(400).json({ error: "Missing or invalid orderId" });
  }

  try {
    const client = await clientPromise;
    if (!client) {
      return res
        .status(500)
        .json({ error: "DB not initialized (check MONGODB_URI)" });
    }
    const db = client.db();

    const o = await db
      .collection<RawOrder>("orders")
      .findOne({ stripeSessionId: orderId });

    if (!o) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Amount: prefer finalized `amount` (webhook), else fall back
    const amount =
      (typeof o.amount === "number" ? o.amount : undefined) ??
      (typeof o.saleTotal === "number" ? o.saleTotal : undefined) ??
      (typeof o.originalTotal === "number" ? o.originalTotal : 0);

    // Build a human-friendly address string with new or legacy keys
    const addr = o.address || {};
    const line1 = addr.line1 ?? (addr as any).street ?? "";
    const line2 = addr.line2 ?? "";
    const city = addr.city ?? "";
    const state = addr.state ?? "";
    const postal = addr.postal_code ?? (addr as any).zip ?? "";
    const country = addr.country ?? "";

    const formattedAddress =
      o.customerAddress ||
      [line1, line2, [city, state].filter(Boolean).join(", "), postal, country]
        .filter(Boolean)
        .join(", ");

    // Items: prefer unitPrice (new), fall back to legacy fields (all as numbers)
    const items = (o.items || []).map((i) => {
      const unit =
        (typeof i.unitPrice === "number" ? i.unitPrice : undefined) ??
        (typeof i.salePrice === "number" ? i.salePrice : undefined) ??
        (typeof i.discountedPrice === "number"
          ? i.discountedPrice
          : undefined) ??
        (typeof i.originalPrice === "number" ? i.originalPrice : undefined) ??
        (typeof i.price === "number" ? i.price : 0);

      const discounted =
        (typeof i.salePrice === "number" ? i.salePrice : undefined) ??
        (typeof i.discountedPrice === "number" ? i.discountedPrice : undefined);

      return {
        name: i.name,
        quantity: typeof i.quantity === "number" ? i.quantity : 1,
        price: unit, // guaranteed number
        discountedPrice: discounted, // number | undefined
        image: i.image || "",
        size: i.size ?? null,
      };
    });

    const createdAtIso =
      typeof o.createdAt === "string"
        ? new Date(o.createdAt).toISOString()
        : o.createdAt instanceof Date
        ? o.createdAt.toISOString()
        : new Date().toISOString();

    return res.status(200).json({
      _id: String(o._id),
      stripeSessionId: o.stripeSessionId,
      orderNumber: typeof o.orderNumber === "number" ? o.orderNumber : null,
      items,
      amount,
      refundedTotal: typeof o.refundedTotal === "number" ? o.refundedTotal : 0,
      refunds: Array.isArray(o.refunds) ? o.refunds : [],
      currency: o.currency ?? "usd",
      paymentStatus: o.paymentStatus ?? "",
      customerAddress: formattedAddress,
      address: o.address ?? {},
      createdAt: createdAtIso,
      shipped: !!o.shipped,
      archived: !!o.archived,
      shipping_address_string: o.shipping_address_string ?? formattedAddress,
    });
  } catch (err: any) {
    console.error("❌ Failed to fetch order:", err?.message || err);
    return res.status(500).json({ error: "Server error" });
  }
}
