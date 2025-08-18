// 📂 pages/api/admin/order.ts – Return single order details by ID (Stripe sessionId OR Mongo _id)
// Compatible with both legacy (originalPrice/salePrice) and new (unitPrice) items

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/* ---------- Raw DB Shapes ---------- */
interface RawOrderItem {
  name?: string;
  quantity?: number;
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
  provider?: string; // "stripe" | "paypal" | etc
  status?: string;
}

interface RawOrder {
  _id: ObjectId; // ✅ strongly typed
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string; // string form
  shipping_address_string?: string; // printable string from webhook
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

  // totals (dollars)
  amount?: number; // authoritative (webhook)
  saleTotal?: number; // set by checkout
  originalTotal?: number; // set by checkout

  currency?: string;
  paymentStatus?: string;
  createdAt?: Date | string;
  stripeSessionId: string;
  orderNumber?: number;
  shipped?: boolean;
  archived?: boolean;

  // refunds
  refundedTotal?: number; // cents
  refunds?: RefundEntry[];
}

/* ---------- API Shape ---------- */
type OrderResponse =
  | {
      _id: string;
      stripeSessionId: string;
      orderNumber: number | null;

      // Full price shape (new + legacy aliases)
      items: {
        name: string;
        quantity: number;
        unitPrice: number; // the unit price to display
        salePrice?: number; // canonical sale price (if discounted)
        originalPrice: number; // base/original price
        price: number; // legacy alias for originalPrice
        discountedPrice?: number; // legacy alias for salePrice
        image?: string;
        size?: string | null;
      }[];

      amount: number; // dollars
      refundedTotal: number; // cents
      refunds: RefundEntry[];
      currency: string;
      paymentStatus: string;

      customerName: string;
      customerEmail: string;

      customerAddress: string; // formatted string
      address: RawOrder["address"]; // raw object if needed elsewhere
      shipping_address_string: string; // preferred printable address

      createdAt: string; // ISO
      shipped: boolean;
      archived: boolean;
    }
  | { error: string };

/* ---------- Helpers ---------- */
const asNumber = (v: unknown, d = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

const sanitizeName = (name?: string, email?: string) => {
  const raw = (name || "").trim();
  if (raw && raw.toLowerCase() !== "stripe") return raw;
  const local = (email || "").split("@")[0]?.replace(/\./g, " ").trim();
  return local || "Customer";
};

const looksLikeObjectId = (s?: string) => !!s && /^[0-9a-fA-F]{24}$/.test(s);

/* ---------- Handler ---------- */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId } = req.query; // may be Stripe sessionId OR Mongo _id
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
    const Orders = db.collection<RawOrder>("orders");

    // ✅ Narrow the filter instead of passing a union to findOne (prevents TS2769)
    let o: RawOrder | null = null;
    if (looksLikeObjectId(orderId)) {
      o = await Orders.findOne({ _id: new ObjectId(orderId) });
    } else {
      o = await Orders.findOne({ stripeSessionId: orderId });
    }

    if (!o) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 💵 Amount: prefer finalized webhook amount; else fall back
    const amount: number =
      (typeof o.amount === "number" ? o.amount : undefined) ??
      (typeof o.saleTotal === "number" ? o.saleTotal : undefined) ??
      (typeof o.originalTotal === "number" ? o.originalTotal : 0);

    // 📍 Build a human-friendly address string with new or legacy keys (as fallback)
    const addr = o.address || {};
    const line1 = addr.line1 ?? (addr as any).street ?? "";
    const line2 = addr.line2 ?? "";
    const city = addr.city ?? "";
    const state = addr.state ?? "";
    const postal = addr.postal_code ?? (addr as any).zip ?? "";
    const country = addr.country ?? "";

    const formattedFromObj = [
      line1,
      line2,
      [city, state].filter(Boolean).join(", "),
      postal,
      country,
    ]
      .filter(Boolean)
      .join(", ");

    const shippingPrintable =
      o.shipping_address_string || formattedFromObj || o.customerAddress || "";

    // 🧾 Items: compute full price shape
    const items = (o.items || []).map((i) => {
      const originalPrice =
        (typeof i.originalPrice === "number" ? i.originalPrice : undefined) ??
        (typeof i.price === "number" ? i.price : 0);

      const salePrice =
        (typeof i.salePrice === "number" ? i.salePrice : undefined) ??
        (typeof i.discountedPrice === "number" ? i.discountedPrice : undefined);

      const unitPrice =
        (typeof i.unitPrice === "number" ? i.unitPrice : undefined) ??
        (typeof salePrice === "number" ? salePrice : undefined) ??
        originalPrice;

      return {
        name: i.name || "Item",
        quantity: typeof i.quantity === "number" ? i.quantity : 1,

        // New canonical fields
        unitPrice: asNumber(unitPrice, 0),
        salePrice: typeof salePrice === "number" ? salePrice : undefined,
        originalPrice: asNumber(originalPrice, 0),

        // Legacy aliases for older UIs (kept consistent with other admin APIs)
        price: asNumber(originalPrice, 0),
        discountedPrice: typeof salePrice === "number" ? salePrice : undefined,

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

    const customerName = sanitizeName(o.customerName, o.customerEmail);

    return res.status(200).json({
      _id: String(o._id),
      stripeSessionId: o.stripeSessionId,
      orderNumber: typeof o.orderNumber === "number" ? o.orderNumber : null,

      items,
      amount,

      refundedTotal: typeof o.refundedTotal === "number" ? o.refundedTotal : 0, // cents
      refunds: Array.isArray(o.refunds) ? o.refunds : [],

      currency: o.currency ?? "usd",
      paymentStatus: o.paymentStatus ?? "",

      customerName,
      customerEmail: o.customerEmail || "",

      customerAddress: o.customerAddress || formattedFromObj,
      address: o.address ?? {},
      shipping_address_string: shippingPrintable,

      createdAt: createdAtIso,
      shipped: !!o.shipped,
      archived: !!o.archived,
    });
  } catch (err: any) {
    console.error("❌ Failed to fetch order:", err?.message || err);
    return res.status(500).json({ error: "Server error" });
  }
}
