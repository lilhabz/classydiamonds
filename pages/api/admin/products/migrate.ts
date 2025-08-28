// pages/api/admin/products/migrate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/mongodb"; // ✅ unified DB helper

type Ok = { ok: true; productId: string; product?: any };
type Err = { ok: false; error: string };

// ✅ single source of truth: PRODUCTS_COLLECTION → NEXT_PUBLIC_PRODUCTS_COLLECTION → 'products'
const PRIMARY_COLLECTION =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

const toNum = (v: any, d = 0) => {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : d;
};

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
    description = "",
    department, // optional; if provided, keep it
    images, // optional array
  } = req.body || {};

  if (!name || !slug) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing required fields: name, slug" });
  }

  try {
    const db = await getDb();
    const products = db.collection(PRIMARY_COLLECTION);

    // Normalize payload to match the rest of the app
    const docBase = {
      name: String(name),
      title: String(name),
      slug: String(slug),
      price: toNum(price, 0),
      salePrice: salePrice == null ? null : toNum(salePrice, 0),
      category: category ? String(category) : undefined,
      subCategory: subcategory ? String(subcategory) : null,
      imageUrl: imageUrl ? String(imageUrl) : null,
      images: Array.isArray(images) ? images.map(String) : undefined,
      archived: !!archived,
      specs: specs && typeof specs === "object" ? specs : {},
      audience: Array.isArray(audience)
        ? audience.map(String)
        : [String(audience)],
      description: String(description || ""),
      department:
        department && (department === "watch" || department === "jewelry")
          ? department
          : undefined,
    };

    // If a product with this slug exists in PRIMARY, update; otherwise insert
    const existing = await products.findOne({ slug: docBase.slug });
    if (existing) {
      const { value } = await products.findOneAndUpdate(
        { _id: existing._id },
        {
          $set: { ...docBase, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { returnDocument: "after", upsert: true }
      );

      return res
        .status(200)
        .json({ ok: true, productId: String(value?._id), product: value });
    }

    const now = new Date();
    const insertDoc = {
      ...docBase,
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await products.insertOne(insertDoc);
    return res.status(200).json({
      ok: true,
      productId: String(insertedId),
      product: { ...insertDoc, _id: insertedId },
    });
  } catch (e: any) {
    console.error("migrate error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Migration failed" });
  }
}
