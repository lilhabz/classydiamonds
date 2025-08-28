// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/products";
import { adaptLegacyProduct, adaptNewProduct } from "@/lib/productAdapter";

type Ok = {
  ok: true;
  products: any[];
  counts: { new: number; legacy: number };
};
type Err = { ok: false; error: string };

async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return null;
  }
  return session;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const db = await getDb();

  // controls
  const includeLegacy =
    String(req.query.includeLegacy ?? "1").toLowerCase() !== "0" &&
    String(req.query.includeLegacy ?? "1").toLowerCase() !== "false";

  // optional search filter (simple)
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const makeFilter = (fields: string[]) =>
    q
      ? {
          $or: fields.map((f) => ({
            [f]: {
              $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          })),
        }
      : {};

  // 1) current products
  const currentDocs = await db
    .collection("products")
    .find(makeFilter(["name", "slug", "category", "subCategory", "department"]))
    .toArray();

  const newProducts = currentDocs.map(adaptNewProduct);

  // 2) legacy products (optional)
  let legacyProducts: any[] = [];
  if (includeLegacy) {
    try {
      const legacyDocs = await db
        .collection("legacyProducts")
        .find(
          makeFilter([
            "name",
            "title",
            "productName",
            "slug",
            "category",
            "subcategory",
          ])
        )
        .toArray();
      legacyProducts = legacyDocs.map(adaptLegacyProduct);
    } catch {
      // collection may not exist; ignore
      legacyProducts = [];
    }
  }

  // Combine & sort (new first, then legacy; each by updatedAt desc, fallback name)
  const all = [...newProducts, ...legacyProducts].sort((a, b) => {
    if (a.isLegacy !== b.isLegacy) return a.isLegacy ? 1 : -1; // new first
    const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (bt !== at) return bt - at;
    return (a.name || "").localeCompare(b.name || "");
  });

  return res.status(200).json({
    ok: true,
    products: all,
    counts: { new: newProducts.length, legacy: legacyProducts.length },
  });
}
