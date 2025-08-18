import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin)
    return res.status(401).json({ error: "Unauthorized" });

  const { orderId, reason } = req.body || {};
  if (typeof orderId !== "string" || !isValidObjectId(orderId)) {
    return res.status(400).json({ error: "Invalid orderId" });
  }

  try {
    const db = (await clientPromise).db();
    const Orders = db.collection("orders");
    const AdminLogs = db.collection("adminLogs");
    const _id = new ObjectId(orderId);

    const existing = await Orders.findOne({ _id });
    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (existing.status === "refunded") return res.status(200).json({ ok: true });

    await Orders.updateOne(
      { _id },
      {
        $set: {
          status: "refunded",
          refundedAt: new Date(),
          ...(reason ? { refundReason: reason } : {}),
        },
      }
    );

    await AdminLogs.insertOne({
      orderId,
      action: "refunded",
      timestamp: new Date(),
      performedBy: session.user.email,
      ...(reason ? { reason } : {}),
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("refund error:", e);
    return res.status(500).json({ error: e.message || "Refund failed" });
  }
}
