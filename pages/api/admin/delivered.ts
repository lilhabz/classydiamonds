// 📂 pages/api/admin/delivered.ts – Get delivered orders 📬 (size + unitPrice aware, junk-filtered)

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

    // 🔎 Delivered orders, excluding junk: must have orderNumber OR a non-empty stripeSessionId
    const rawOrders = await db
      .collection("orders")
      .find({
        delivered: true,
        $or: [
          { orderNumber: { $exists: true, $ne: null } },
          { stripeSessionId: { $exists: true, $ne: "" } },
        ],
      })
      .sort({ deliveredAt: -1, _id: -1 })
      .toArray();

    // 🔄 Remap with rich pricing + normalized dates + sanitized names
    const orders = rawOrders.map((o: any) => {
      const rawName = (o.customerName || "").trim();
      const customerName =
        rawName && rawName.toLowerCase() !== "stripe"
          ? rawName
          : (o.customerEmail || "")
              .split("@")[0]
              ?.replace(/\./g, " ")
              ?.trim() || "Customer";

      return {
        _id: String(o._id),
        customerName,
        customerEmail: o.customerEmail || "",
        customerAddress: o.customerAddress || "",
        shipping_address_string: o.shipping_address_string || "",

        amount: typeof o.amount === "number" ? o.amount : 0,
        currency: o.currency || "usd",
        paymentStatus: o.paymentStatus || "",

        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : "",
        delivered: !!o.delivered,
        deliveredAt: o.deliveredAt ? new Date(o.deliveredAt).toISOString() : "",
        archived: !!o.archived,

        orderNumber:
          typeof o.orderNumber === "number" ? o.orderNumber : undefined,
        stripeSessionId: o.stripeSessionId || "",

        trackingNumber: o.trackingNumber || "",
        carrier: o.carrier || "",
        trackingEmailSentAt: o.trackingEmailSentAt
          ? new Date(o.trackingEmailSentAt).toISOString()
          : "",

        // 🔹 Items with full price shape so UI can render unit price + totals
        items: (o.items || []).map((i: any) => {
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
            name: i.name || "Item",
            quantity:
              typeof i.quantity === "number"
                ? i.quantity
                : Number(i.quantity) || 1,

            // Rich price shape expected by UIs:
            price: originalPrice, // legacy/base
            discountedPrice:
              i.salePrice !== undefined && typeof i.salePrice === "number"
                ? i.salePrice
                : undefined, // alias for older UIs
            salePrice, // canonical
            unitPrice,
            originalPrice,

            image: (i.image || "").trim(),
            size: i.size || undefined,
          };
        }),
      };
    });

    // ✅ Return the mapped array
    return res.status(200).json({ orders });
  } catch (err: any) {
    console.error("❌ Failed to fetch delivered orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
