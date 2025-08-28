// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/products";

const pickCatalogName =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

/** Admin gate */
async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return null;
  }
  return session as any;
}

/** Build filter that matches string _id or ObjectId */
function makeIdFilter(idParam: string | string[] | undefined) {
  const raw =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
      ? idParam[0]
      : "";
  if (!raw) return null;
  const ors: any[] = [{ _id: raw }];
  try {
    ors.push({ _id: new ObjectId(raw) });
  } catch {}
  return ors.length === 1 ? ors[0] : { $or: ors };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const db = await getDb();
  const idFilter = makeIdFilter(req.query.id);
  if (!idFilter)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  const collectionsToQuery = Array.from(new Set([pickCatalogName, "products"]));

  if (req.method === "GET") {
    for (const colName of collectionsToQuery) {
      try {
        const found = await db.collection(colName).findOne(idFilter as any);
        if (found) {
          return res
            .status(200)
            .json({ ok: true, product: found, collection: colName });
        }
      } catch {}
    }
    // legacy fallback
    try {
      const legacy = await db
        .collection("legacyProducts")
        .findOne(idFilter as any);
      if (legacy) {
        return res
          .status(200)
          .json({
            ok: true,
            product: legacy,
            note: "Served from legacyProducts",
          });
      }
    } catch {}
    return res.status(404).json({ ok: false, error: "Product not found" });
  }

  if (req.method === "PUT") {
    const update = { ...(req.body ?? {}) };
    if ("_id" in update) delete (update as any)._id;

    for (const colName of collectionsToQuery) {
      try {
        const { value } = await db
          .collection(colName)
          .findOneAndUpdate(
            idFilter as any,
            { $set: { ...update, updatedAt: new Date() } },
            { returnDocument: "after" }
          );
        if (value)
          return res
            .status(200)
            .json({ ok: true, product: value, collection: colName });
      } catch {}
    }
    return res.status(404).json({ ok: false, error: "Product not found" });
  }

  if (req.method === "DELETE") {
    for (const colName of collectionsToQuery) {
      try {
        const result = await db.collection(colName).deleteOne(idFilter as any);
        if (result.deletedCount) {
          return res
            .status(200)
            .json({ ok: true, deleted: true, collection: colName });
        }
      } catch {}
    }
    return res.status(404).json({ ok: false, error: "Product not found" });
  }

  res.setHeader("Allow", "GET,PUT,DELETE");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
