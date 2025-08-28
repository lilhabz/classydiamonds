// pages/api/_debug/catalog-inventory.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/products";

type Row = {
  collection: string;
  count: number;
  productish: boolean;
  sampleKeys: string[];
  sampleDoc?: Record<string, any>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const db = await getDb();

    // list all collections
    const cols = await db.listCollections().toArray();
    const names = cols.map((c: any) => c.name).sort();

    // heuristics for “product-like” collections
    const maybeProductNames = [
      "products",
      "product",
      "catalog",
      "items",
      "inventory",
      "storeProducts",
      "store_items",
      "shopifyProducts",
      "merch",
      "sku",
      "skus",
    ];

    const results: Row[] = [];
    for (const name of names) {
      const col = db.collection(name);
      const count = await col.estimatedDocumentCount();
      if (!count) {
        results.push({
          collection: name,
          count,
          productish: false,
          sampleKeys: [],
        });
        continue;
      }

      // small peek at first doc
      const sample = await col.find({}).limit(1).toArray();
      const doc = sample[0] || {};
      const keys = Object.keys(doc || {}).sort();

      // “producty” if it has typical fields OR name hints
      const hasProductFields = [
        "name",
        "title",
        "slug",
        "price",
        "category",
        "images",
        "image",
        "imageUrl",
      ].some((k) => k in doc);
      const productish = hasProductFields || maybeProductNames.includes(name);

      results.push({
        collection: name,
        count,
        productish,
        sampleKeys: keys.slice(0, 25),
        sampleDoc: productish ? sanitize(doc) : undefined, // include one doc only if productish
      });
    }

    // also return a quick check of the two we’ve been using
    const checks: Record<string, number> = {};
    for (const key of ["products", "legacyProducts"]) {
      try {
        checks[key] = await db.collection(key).estimatedDocumentCount();
      } catch {
        checks[key] = -1;
      }
    }

    return res.status(200).json({
      ok: true,
      collections: results,
      quickCounts: checks,
      note: "READ-ONLY diagnostic. Remove this file after use.",
    });
  } catch (e: any) {
    console.error(e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "diagnostic failed" });
  }
}

function sanitize(doc: any) {
  if (!doc || typeof doc !== "object") return doc;
  const out: any = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k.toLowerCase().includes("secret") || k.toLowerCase().includes("token"))
      continue;
    out[k] = v;
  }
  return out;
}
