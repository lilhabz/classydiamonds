// 📂 pages/api/admin/archived.ts – Get Archived Orders + Archive/Restore with Logging ♻️🗂 (size-aware)

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db();

  if (req.method === "GET") {
    try {
      // 1️⃣ Fetch archived orders, excluding junk (must have orderNumber OR stripeSessionId)
      const raw = await db
        .collection("orders")
        .find({
          archived: true,
          $or: [
            { orderNumber: { $exists: true, $ne: null } },
            { stripeSessionId: { $exists: true, $ne: "" } },
          ],
        })
        .sort({ archivedAt: -1, _id: -1 })
        .toArray();

      // 2️⃣ Remap each order’s items to expose full price shape + image + size
      const orders = raw.map((o: any) => {
        // Sanitize legacy "Stripe" names
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
          archived: !!o.archived,
          archivedAt: o.archivedAt ? new Date(o.archivedAt).toISOString() : "",
          orderNumber:
            typeof o.orderNumber === "number" ? o.orderNumber : undefined,
          stripeSessionId: o.stripeSessionId || "",

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

              // Rich price shape for UI:
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
      console.error("❌ Failed to fetch archived orders:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "POST") {
    const { orderId, restore, adminName } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }
    try {
      const update = restore
        ? { $set: { archived: false }, $unset: { archivedAt: "" } }
        : { $set: { archived: true, archivedAt: new Date() } };

      const result = await db
        .collection("orders")
        .updateOne({ stripeSessionId: orderId }, update);

      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ error: "Order not found or already in desired state" });
      }

      await db.collection("adminLogs").insertOne({
        orderId,
        action: restore ? "restore" : "archive",
        timestamp: new Date(),
        performedBy: adminName || "unknown",
      });

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("❌ Failed to update archive state:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
