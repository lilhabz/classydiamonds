// pages/api/facets.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { category, subcategory } = req.query as {
      category?: string;
      subcategory?: string;
    };

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "classydiamonds");

    const match: any = {};
    if (category) match.category = String(category).toLowerCase();
    if (subcategory) match.subcategory = String(subcategory).toLowerCase();

    // normalized, top-level facet fields
    const [metals, stones, shapes, styles, colors, clarities, cuts] =
      await Promise.all([
        db.collection("products").distinct("metal", match),
        db.collection("products").distinct("stone", match),
        db.collection("products").distinct("shape", match),
        db.collection("products").distinct("style", match), // extra
        db.collection("products").distinct("color", match), // extra
        db.collection("products").distinct("clarity", match), // extra
        db.collection("products").distinct("cut", match), // extra
      ]);

    const agg = await db
      .collection("products")
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
            minCarat: { $min: "$carat" },
            maxCarat: { $max: "$carat" },
          },
        },
      ])
      .toArray();

    const g = agg[0] || {};
    const priceBounds = {
      min: Number.isFinite(g.minPrice) ? g.minPrice : 0,
      max: Number.isFinite(g.maxPrice) ? g.maxPrice : 50000,
    };
    const caratBounds = {
      min: Number.isFinite(g.minCarat) ? g.minCarat : 0,
      max: Number.isFinite(g.maxCarat) ? g.maxCarat : 10,
    };

    res.status(200).json({
      metals: (metals || []).filter(Boolean),
      stones: (stones || []).filter(Boolean),
      shapes: (shapes || []).filter(Boolean),
      extras: {
        style: (styles || []).filter(Boolean),
        color: (colors || []).filter(Boolean),
        clarity: (clarities || []).filter(Boolean),
        cut: (cuts || []).filter(Boolean),
      },
      priceBounds,
      caratBounds,
    });
  } catch (e: any) {
    res.status(200).json({
      metals: [],
      stones: [],
      shapes: [],
      extras: { style: [], color: [], clarity: [], cut: [] },
      priceBounds: { min: 0, max: 50000 },
      caratBounds: { min: 0, max: 10 },
      error: e?.message || "facets failed",
    });
  }
}
