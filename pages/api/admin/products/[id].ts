// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/products";

// Use the same env-based catalog collection the storefront uses
const catalogCollectionName =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

/** Require admin session (loose typing so TS doesn't block build) */
async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return null;
  }
  return session as any;
}

/** Build a filter that matches either ObjectId or string _id */
function makeIdFilter(idParam: string | string[] | undefined) {
  const raw =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
      ? idParam[0]
      : "";
  if (!raw) return null;

  const ors: any[] = [{ _id: raw }]; // string _id support
  try {
    ors.push({ _id: new ObjectId(raw) }); // ObjectId support
  } catch {
    // not a valid ObjectId; ignore
  }
  return ors.length === 1 ? ors[0] : { $or: ors };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Auth
  const session = await requireAdmin(req, res);
  if (!session) return;

  const db = await getDb();
  const idFilter = makeIdFilter(req.query.id);
  if (!idFilter) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const productsCol = db.collection(catalogCollectionName);

  if (req.method === "GET") {
    // Primary: find in the resolved catalog collection
    const product = await productsCol.findOne(idFilter as any);
    if (product) {
      return res
        .status(200)
        .json({ ok: true, product, collection: catalogCollectionName });
    }

    // Optional fallback: check legacy collection if it exists
    try {
      const legacyProduct = await db
        .collection("legacyProducts")
        .findOne(idFilter as any);
      if (legacyProduct) {
        return res
          .status(200)
          .json({
            ok: true,
            product: legacyProduct,
            note: "Served from legacyProducts",
          });
      }
    } catch {
      /* legacy collection may not exist */
    }

    return res.status(404).json({ ok: false, error: "Product not found" });
  }

  if (req.method === "PUT") {
    const update = { ...(req.body ?? {}) };
    if ("_id" in update) delete (update as any)._id;

    const { value } = await productsCol.findOneAndUpdate(
      idFilter as any,
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!value)
      return res.status(404).json({ ok: false, error: "Product not found" });
    return res.status(200).json({ ok: true, product: value });
  }

  if (req.method === "DELETE") {
    const { deletedCount } = await productsCol.deleteOne(idFilter as any);
    if (!deletedCount)
      return res.status(404).json({ ok: false, error: "Product not found" });
    return res.status(200).json({ ok: true, deleted: true });
  }

  res.setHeader("Allow", "GET,PUT,DELETE");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
