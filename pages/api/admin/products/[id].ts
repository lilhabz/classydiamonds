// /pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type ApiResp =
  | { ok: true; product?: any }
  | { ok: true; deleted?: boolean }
  | { ok: false; error: string };

function toObjectId(id?: string) {
  try {
    return id ? new ObjectId(id) : null;
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp>
) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET,PUT,PATCH,DELETE,OPTIONS");
    return res.status(204).end();
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !(session.user as any).isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const { id } = req.query as { id: string };
  const _id = toObjectId(id);
  if (!_id) return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("products");

    if (req.method === "GET") {
      const product = await collection.findOne({ _id });
      if (!product)
        return res.status(404).json({ ok: false, error: "Not found" });
      return res.status(200).json({ ok: true, product });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
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
      const r = await collection.deleteOne({ _id });
      if (!r.deletedCount)
        return res.status(404).json({ ok: false, error: "Not found" });
      return res.status(200).json({ ok: true, deleted: true });
    }

    res.setHeader("Allow", "GET,PUT,PATCH,DELETE,OPTIONS");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (err: any) {
    console.error("Admin product [id] API error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Server error" });
  }
}
