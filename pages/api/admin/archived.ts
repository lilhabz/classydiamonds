// 📂 pages/api/admin/archived.ts – Get Archived Orders + Archive/Restore with Logging ♻️🗂 (size-aware)

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
// (getServerSession/authOptions were imported but unused; safe to remove)

type OrderStatus = "pending" | "shipped" | "refunded" | "archived";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db();

  if (req.method === "GET") {
    try {
      // 1️⃣ Fetch raw archived orders
      const raw = await db
        .collection("orders")
        .find({ $or: [{ status: "archived" }, { archived: true }] })
        .sort({ archivedAt: -1 })
        .toArray();

      // 2️⃣ Remap each order’s items to expose both prices + image + size
      const orders = raw.map((o: any) => {
        const status: OrderStatus =
          o.status ||
          (o.archived
            ? "archived"
            : o.shippedAt || o.shipped
            ? "shipped"
            : "pending");
        return {
          _id: o._id.toString(),
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          customerAddress: o.customerAddress,
          shipping_address_string: o.shipping_address_string,
          amount: o.amount,
          currency: o.currency || "usd",
          paymentStatus: o.paymentStatus || "",
          createdAt: o.createdAt,
          archived: o.archived ?? false,
          archivedAt: o.archivedAt,
          orderNumber: o.orderNumber,
          stripeSessionId: o.stripeSessionId,
          status,
          refundedAt: o.refundedAt ? new Date(o.refundedAt).toISOString() : undefined,
          refundReason: o.refundReason,

          items: (o.items || []).map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.originalPrice, // original price
            discountedPrice:
              i.salePrice !== undefined ? i.salePrice : undefined, // sale price if discounted
            image: i.image || "",
            size: i.size || undefined, // 🆕 include ring size
          })),
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
        ? { $set: { archived: false, status: "pending" }, $unset: { archivedAt: "" } }
        : { $set: { archived: true, archivedAt: new Date(), status: "archived" } };

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
