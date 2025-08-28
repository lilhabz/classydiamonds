// pages/api/admin/products/migrate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/products";

type Ok = { ok: true; productId: string; product?: any };
type Err = { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  // Auth: admin only
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Expect payload from your onMigrate() call
  const {
    name,
    slug,
    price,
    salePrice = null,
    category,
    subcategory = null,
    imageUrl = null,
    archived = false,
    specs = {},
    audience = ["unisex"],
  } = req.body || {};

  if (!name || !slug) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing required fields: name, slug" });
  }

  try {
    const db = await getDb();
    const products = db.collection("products");

    // Optional: if a product with this slug exists, update instead of inserting
    const existing = await products.findOne({ slug });
    if (existing) {
      const { value } = await products.findOneAndUpdate(
        { _id: existing._id },
        {
          $set: {
            name,
            slug,
            price: Number(price ?? 0),
            salePrice: salePrice == null ? null : Number(salePrice),
            category,
            subCategory: subcategory,
            imageUrl,
            archived: !!archived,
            specs: specs || {},
            audience: Array.isArray(audience) ? audience : [String(audience)],
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { returnDocument: "after", upsert: true }
      );

      return res
        .status(200)
        .json({ ok: true, productId: String(value?._id), product: value });
    }

    // Insert new
    const doc = {
      name,
      slug,
      price: Number(price ?? 0),
      salePrice: salePrice == null ? null : Number(salePrice),
      category,
      subCategory: subcategory,
      imageUrl,
      archived: !!archived,
      specs: specs || {},
      audience: Array.isArray(audience) ? audience : [String(audience)],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { insertedId } = await products.insertOne(doc);
    return res
      .status(200)
      .json({
        ok: true,
        productId: String(insertedId),
        product: { ...doc, _id: insertedId },
      });
  } catch (e: any) {
    console.error("migrate error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Migration failed" });
  }
}
