// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { listProducts, getDb } from "@/lib/products";

/**
 * Supports:
 *  - department: "jewelry" | "watch" (required)
 *  - category, subCategory (optional)
 *  - q (text search)
 *  - audience (csv)
 *  - specs: JSON string (e.g., {"metal":"gold","carat":1})
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method === "GET") {
    const { department, category, subCategory, q, audience, specs } = req.query;

    if (typeof department !== "string" || !department) {
      // Default department to jewelry for safety (UI always sends it)
      (req.query as any).department = "jewelry";
    }

    const filter: any = { department: String(req.query.department) };

    if (typeof category === "string" && category) filter.category = category;
    if (typeof subCategory === "string" && subCategory) filter.subCategory = subCategory;

    if (typeof q === "string" && q.trim() !== "") {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    if (typeof audience === "string" && audience) {
      const a = audience.split(",").map((s) => s.trim()).filter(Boolean);
      if (a.length) {
        filter.$expr = {
          $gt: [
            {
              $size: {
                $setIntersection: [{ $ifNull: ["$audience", ["unisex"]] }, a],
              },
            },
            0,
          ],
        };
      }
    }

    if (typeof specs === "string" && specs) {
      try {
        const wanted = JSON.parse(specs);
        // Build AND of each wanted spec = value (exact match)
        const and: any[] = [];
        for (const [k, v] of Object.entries(wanted)) {
          and.push({ [`specs.${k}`]: v });
        }
        if (and.length) filter.$and = [...(filter.$and || []), ...and];
      } catch {
        // ignore invalid JSON
      }
    }

    const items = await listProducts(filter, { sort: { createdAt: -1 }, limit: 500 });
    return res.status(200).json({ products: items });
  }

  if (req.method === "POST") {
    try {
      const db = await getDb(); // not used directly, kept if you add side effects later
      const { createProduct } = await import("@/lib/products");
      const created = await createProduct(req.body);
      return res.status(201).json({ product: created });
    } catch (e: any) {
      console.error("create product error", e);
      return res.status(400).json({ error: e?.message || "Create failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
