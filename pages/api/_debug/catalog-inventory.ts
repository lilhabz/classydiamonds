// pages/api/_debug/catalog-inventory.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/mongodb"; // ✅ fixed import

type Row = {
  collection: string;
  exists: boolean;
  count: number;
  sample?: Array<{ _id: string; slug?: string; name?: string; title?: string }>;
};

type Ok = {
  ok: true;
  primaryCollection: string;
  alsoQueried: string[];
  rows: Row[];
};
type Err = { ok: false; error: string };

// Resolve like the rest of the app
const PRIMARY_COLLECTION =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  try {
    const db = await getDb();

    // We always look at the primary + the hard-coded "products"
    const collectionsToCheck = Array.from(
      new Set([PRIMARY_COLLECTION, "products", "legacyProducts"])
    );

    const rows: Row[] = [];

    for (const name of collectionsToCheck) {
      try {
        const exists = !!(
          await db.listCollections({ name }, { nameOnly: true }).toArray()
        ).length;

        if (!exists) {
          rows.push({ collection: name, exists: false, count: 0 });
          continue;
        }

        const col = db.collection(name);
        const count = (await col.estimatedDocumentCount().catch(async () => {
          // fall back to countDocuments if needed
          await col.countDocuments();
        })) as number;

        const sampleDocs = await col
          .find({}, { projection: { _id: 1, slug: 1, name: 1, title: 1 } })
          .limit(5)
          .toArray();

        rows.push({
          collection: name,
          exists: true,
          count: Number(count) || 0,
          sample: sampleDocs.map((d: any) => ({
            _id: String(d._id),
            slug: d.slug,
            name: d.name,
            title: d.title,
          })),
        });
      } catch {
        rows.push({ collection: name, exists: false, count: 0 });
      }
    }

    return res.status(200).json({
      ok: true,
      primaryCollection: PRIMARY_COLLECTION,
      alsoQueried: ["products", "legacyProducts"],
      rows,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "debug failed" });
  }
}
