import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/mongodb";

type Row = {
  name: string;
  count: number;
  sample?: Array<{ _id: string; slug?: string; name?: string; title?: string }>;
};

type Ok = { ok: true; db: string | undefined; rows: Row[] };
type Err = { ok: false; error: string };

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  try {
    const db = await getDb();
    const dbName = db.databaseName;

    const cols = await db.listCollections({}, { nameOnly: true }).toArray();
    const rows: Row[] = [];

    for (const { name } of cols) {
      try {
        const col = db.collection(name);
        const count =
          (await col
            .estimatedDocumentCount()
            .catch(() => col.countDocuments())) || 0;

        // quick light sample to spot product-like fields
        const sample = await col
          .find(
            {},
            { projection: { _id: 1, slug: 1, name: 1, title: 1 }, limit: 5 }
          )
          .toArray();

        rows.push({
          name,
          count: Number(count),
          sample: sample.map((d: any) => ({
            _id: String(d._id),
            slug: d.slug,
            name: d.name,
            title: d.title,
          })),
        });
      } catch {
        rows.push({ name, count: 0 });
      }
    }

    // Sort: most-populated first
    rows.sort((a, b) => b.count - a.count);

    return res.status(200).json({ ok: true, db: dbName, rows });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "list failed" });
  }
}
