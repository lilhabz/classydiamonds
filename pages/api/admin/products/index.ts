// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { listProducts, createProduct } from "@/lib/products";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method === "GET") {
    const { q, category, audience } = req.query;
    const filter: any = {};

    if (typeof category === "string" && category) filter.category = category;

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

    const items = await listProducts(filter, { sort: { createdAt: -1 }, limit: 500 });
    return res.status(200).json({ products: items });
  }

  if (req.method === "POST") {
    try {
      const created = await createProduct(req.body);
      return res.status(201).json({ product: created });
    } catch (e: any) {
      console.error("create product error", e);
      return res.status(400).json({ error: e?.message || "Create failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
