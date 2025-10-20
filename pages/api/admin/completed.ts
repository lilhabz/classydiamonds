// 📂 pages/api/admin/completed.ts – Get shipped (but not yet delivered) orders + Size/UnitPrice Support ✅
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";


export const runtime = "nodejs";

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

    // 🧹 Exclude junk: must have orderNumber OR a non-empty stripeSessionId
    const rawOrders = await db
      .collection("orders")
      .find({
        shipped: true,
        delivered: { $ne: true },
        $or: [
          { orderNumber: { $exists: true, $ne: null } },
          { stripeSessionId: { $exists: true, $ne: "" } },
        ],
      })
      .sort({ shippedAt: -1, _id: -1 })
      .toArray();

    const orders = rawOrders.map((o: any) => {
      // 🧯 Sanitize legacy "Stripe" names
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

        // Dates as ISO strings for consistent client parsing
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : "",
        shipped: !!o.shipped,
        shippedAt: o.shippedAt ? new Date(o.shippedAt).toISOString() : "",
        delivered: !!o.delivered,
        archived: !!o.archived,

        orderNumber:
          typeof o.orderNumber === "number" ? o.orderNumber : undefined,
        stripeSessionId: o.stripeSessionId || "",

        trackingNumber: o.trackingNumber || "",
        carrier: o.carrier || "",
        trackingEmailSentAt: o.trackingEmailSentAt
          ? new Date(o.trackingEmailSentAt).toISOString()
          : "",

        // Include refundedTotal (cents) so UI can compute remaining refundable
        refundedTotal:
          typeof o.refundedTotal === "number" ? o.refundedTotal : 0,

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

            // Provide a rich shape the UI expects:
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

    return res.status(200).json({ orders });
  } catch (err: any) {
    console.error("❌ Failed to fetch completed orders:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
