// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { ObjectId } from "mongodb";
<<<<<<< HEAD
import { productsData as legacyProducts } from "@/data/productsData";

=======
import { getDb } from "@/lib/products";
>>>>>>> 3220bd4 (	modified:   pages/api/admin/products/[id].ts)

/** Admin gate with simple typing so TS doesn't complain */
async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return null;
  }
  return session as any;
}

function parseObjectId(idParam: string | string[] | undefined) {
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

<<<<<<< HEAD
  const { id } = req.query as { id: string };
  const _id = toObjectId(id);

  try {
    const DB_NAME = process.env.MONGODB_DB;
    if (!DB_NAME)
      return res
        .status(500)
        .json({ ok: false, error: "MONGODB_DB env var not set" });
    const COLL = process.env.PRODUCTS_COLLECTION || "products";
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLL);

    if (req.method === "GET") {
      let product = _id ? await collection.findOne({ _id }) : null;
      if (product) return res.status(200).json({ ok: true, product });


      if (legacy) return res.status(200).json({ ok: true, product: legacy });
      return res
        .status(404)
        .json({ ok: false, error: "Not found. If this was a legacy product, please migrate it." });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      if (!_id) {
        const legacyHit = legacyProducts.find(
          (p) => String(p.id) === id || p.slug === id
        );
        if (legacyHit)
          return res.status(404).json({
            ok: false,
            error: "Not found. If this was a legacy product, please migrate it.",
          });
        return res.status(404).json({ ok: false, error: "Not found" });
      }

      const {
        name,
        price,
        salePrice,
        category,
        subcategory,
        imageUrl,
        audience,
        specs,
        description,
        department,
      } = (req.body ?? {}) as Record<string, any>;

      const priceNum =
        typeof price === "number"
          ? price
          : typeof price === "string" && price.trim() !== ""
          ? Number(price)
          : null;

      const saleNum =
        typeof salePrice === "number"
          ? salePrice
          : typeof salePrice === "string" && salePrice.trim() !== ""
          ? Number(salePrice)
          : null;

      const set: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) set.name = name ?? "";
      if (description !== undefined) set.description = description ?? "";
      if (price !== undefined) set.price = priceNum;
      if (salePrice !== undefined) set.salePrice = saleNum;
      if (category !== undefined) set.category = category ?? null;
      if (subcategory !== undefined) set.subcategory = subcategory ?? null;
      if (imageUrl !== undefined)
        set.imageUrl = imageUrl ?? "/gray-placeholder.jpg";
      if (audience !== undefined)
        set.audience =
          Array.isArray(audience) && audience.length ? audience : ["unisex"];
      if (specs !== undefined)
        set.specs = specs && typeof specs === "object" ? specs : {};
      if (department !== undefined) set.department = department ?? "jewelry";

      const update = { $set: set };
      const result = await collection.findOneAndUpdate({ _id }, update, {
        returnDocument: "after",
      });
      if (!result.value)
        return res.status(404).json({ ok: false, error: "Not found" });
      return res.status(200).json({ ok: true, product: result.value });
    }

    if (req.method === "DELETE") {
      if (!_id) {
        const legacyHit = legacyProducts.find(
          (p) => String(p.id) === id || p.slug === id
        );
        if (legacyHit)
          return res.status(404).json({
            ok: false,
            error: "Not found. If this was a legacy product, please migrate it.",
          });
        return res.status(404).json({ ok: false, error: "Not found" });
      }

      const r = await collection.deleteOne({ _id });
      if (!r.deletedCount)
        return res.status(404).json({ ok: false, error: "Not found" });
      return res.status(200).json({ ok: true, deleted: true });
    }

    res.setHeader("Allow", "GET,PUT,PATCH,DELETE,OPTIONS");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (err: any) {
    console.error("Admin product [id] API error:", err);
=======
  if (req.method === "GET") {
    const product = await productsCol.findOne({ _id });
    if (product) {
      return res.status(200).json({ ok: true, product });
    }

    // Optional legacy fallback: safe even if collection doesn't exist
    let legacyProduct: any = null;
    try {
      legacyProduct = await db.collection("legacyProducts").findOne({ _id });
    } catch {
      /* ignore */
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

>>>>>>> 3220bd4 (	modified:   pages/api/admin/products/[id].ts)
    return res
      .status(404)
      .json({ ok: false, error: "Not found (also not in legacyProducts)" });
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
