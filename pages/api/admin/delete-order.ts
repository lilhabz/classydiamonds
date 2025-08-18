// 📂 pages/api/admin/delete-order.ts — hard delete (admin-only)
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type Body = {
  orderId?: string; // Mongo _id (preferred)
  sessionId?: string; // Stripe session id (fallback)
};

function looksLikeObjectId(s?: string) {
  return !!s && /^[0-9a-fA-F]{24}$/.test(s);
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

  try {
    const { orderId, sessionId } = (req.body || {}) as Body;
    if (!orderId && !sessionId) {
      return res
        .status(400)
        .json({ error: "Provide orderId (Mongo _id) or sessionId" });
    }

    const db = (await clientPromise).db();
    const Orders = db.collection("orders");

    let query: any = null;
    if (looksLikeObjectId(orderId))
      query = { _id: new ObjectId(orderId as string) };
    else if (sessionId) query = { stripeSessionId: sessionId };
    else
      return res
        .status(400)
        .json({ error: "Invalid orderId; missing sessionId fallback" });

    const doc = await Orders.findOne(query);
    if (!doc) return res.status(404).json({ error: "Order not found" });

    await Orders.deleteOne({ _id: doc._id });

    // Optional: log the deletion
    try {
      await db.collection("adminLogs").insertOne({
        orderId: String(doc._id),
        action: "delete_order",
        timestamp: new Date().toISOString(),
        performedBy: session.user.email,
        note: "Hard delete from archived screen",
      });
    } catch {}

    return res.status(200).json({ ok: true, deletedId: String(doc._id) });
  } catch (e: any) {
    console.error("delete-order error:", e);
    return res.status(500).json({ error: e.message || "Delete failed" });
  }
}
