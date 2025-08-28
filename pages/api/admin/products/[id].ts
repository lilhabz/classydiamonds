// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/products"; // <- this must exist in your project

/** Require admin session (loose typing so TS doesn't block build) */
async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return null;
  }
  return session as any;
}

/** Parse ObjectId from dynamic route param */
function parseObjectId(
  idParam: string | string[] | undefined
): ObjectId | null {
  if (!idParam || Array.isArray(idParam)) return null;
  try {
    return new ObjectId(idParam);
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Auth
  const session = await requireAdmin(req, res);
  if (!session) return;

  // DB + ID
  const db = await getDb();
  const _id = parseObjectId(req.query.id);
  if (!_id) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const productsCol = db.collection("products");

  if (req.method === "GET") {
    // Primary: find in products
    const product = await productsCol.findOne({ _id });
    if (product) {
      return res.status(200).json({ ok: true, product });
    }

    // Optional fallback: check legacy collection if it exists
    let legacyProduct: any = null;
    try {
      legacyProduct = await db.collection("legacyProducts").findOne({ _id });
    } catch {
      // collection may not exist; ignore
    }
    if (legacyProduct) {
      return res
        .status(200)
        .json({
          ok: true,
          product: legacyProduct,
          note: "Served from legacyProducts",
        });
    }

    return res.status(404).json({ ok: false, error: "Product not found" });
  }

  if (req.method === "PUT") {
    const update = { ...(req.body ?? {}) };
    if ("_id" in update) delete (update as any)._id;

    const { value } = await productsCol.findOneAndUpdate(
      { _id },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!value)
      return res.status(404).json({ ok: false, error: "Product not found" });
    return res.status(200).json({ ok: true, product: value });
  }

  if (req.method === "DELETE") {
    const { deletedCount } = await productsCol.deleteOne({ _id });
    if (!deletedCount)
      return res.status(404).json({ ok: false, error: "Product not found" });
    return res.status(200).json({ ok: true, deleted: true });
  }

  res.setHeader("Allow", "GET,PUT,DELETE");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
