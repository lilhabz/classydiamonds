// 📂 pages/api/admin/logs.ts – Get All Admin Action Logs 📝
// Returns BOTH legacy keys (performedBy, timestamp, note) and normalized keys (admin, createdAt, notes)

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";


export const runtime = "nodejs";

type RawLog = {
  _id?: any;
  action?: string;

  // legacy/raw fields from DB
  performedBy?: string;
  timestamp?: string;
  note?: string;

  // sometimes present already
  admin?: string;
  createdAt?: string;
  notes?: string;

  // order references in various shapes
  orderId?: string;
  order_id?: string;
  order?: { id?: string; number?: number };
  orderNumber?: number;
  order_no?: number;
  stripeSessionId?: string;

  // misc
  amount?: number;
  tagColor?: string;
};

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

    // Sort primarily by legacy timestamp, then createdAt as a fallback
    const rawLogs: RawLog[] = await db
      .collection<RawLog>("adminLogs")
      .find({})
      .sort({ timestamp: -1, createdAt: -1 })
      .toArray();

    const logs = rawLogs.map((r) => {
      // Normalize order refs
      const orderId =
        r.orderId ??
        r.order_id ??
        r.order?.id ??
        (typeof r.stripeSessionId === "string" ? r.stripeSessionId : undefined);

      const orderNumber =
        r.orderNumber ??
        r.order?.number ??
        (typeof r.order_no === "number" ? r.order_no : undefined);

      // Normalized names
      const admin = r.admin ?? r.performedBy ?? "—";
      const createdAt = r.createdAt ?? r.timestamp;
      const notes = r.notes ?? r.note;

      return {
        // common
        _id: r._id,
        action: r.action,
        amount: r.amount,
        tagColor: r.tagColor,

        // ✅ normalized keys for new UI
        admin,
        createdAt,
        notes,
        orderId,
        orderNumber,

        // ✅ legacy keys preserved so old UI keeps working
        performedBy: r.performedBy,
        timestamp: r.timestamp,
        note: r.note,
      };
    });

    return res.status(200).json({ logs });
  } catch (err) {
    console.error("❌ Failed to fetch admin logs:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
