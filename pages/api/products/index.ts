// pages/api/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { listProducts } from "@/lib/products";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q, category, subCategory, audience, limit } = req.query;

  const filter: any = {};

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
              $setIntersection: [
                { $ifNull: ["$audience", ["unisex"]] },
                a,
              ],
            },
          },
          0,
        ],
      };
    }
  }

  const lim = Math.min(100, Math.max(1, parseInt((limit as string) || "50", 10)));
  const products = await listProducts(filter, { sort: { createdAt: -1 }, limit: lim });
  res.status(200).json({ products });
}
