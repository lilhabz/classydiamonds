// pages/api/admin/maintenance/sku.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/mongodb";
import {
  ensureSkuCounter,
  getNextSkuNumber,
  syncSkuCounterToMax,
} from "@/lib/sku";

type Ok = { ok: true; updated: number };
type Err = { ok: false; error: string };

const PRIMARY_COLLECTION =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const db = await getDb();
    await ensureSkuCounter(db);
    await syncSkuCounterToMax(db, PRIMARY_COLLECTION);

    const cursor = db
      .collection(PRIMARY_COLLECTION)
      .find({
        $or: [{ skuNumber: { $exists: false } }, { skuNumber: null }],
      })
      .sort({ createdAt: 1, _id: 1 });

    let updated = 0;
    for await (const doc of cursor) {
      const next = await getNextSkuNumber(db);
      await db
        .collection(PRIMARY_COLLECTION)
        .updateOne({ _id: doc._id }, { $set: { skuNumber: next } });
      updated++;
    }

    return res.status(200).json({ ok: true, updated });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Backfill failed" });
  }
}
