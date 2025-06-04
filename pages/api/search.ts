import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const query = ((req.query.q as string) || "").trim();
  if (!query) {
    return res.status(200).json([]);
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const regex = new RegExp(query, "i");

    // 📝 Modify the fields inside $or if your product schema changes
    const products = await db
      .collection("products")
      .find({
        $or: [
          { name: { $regex: regex } },
          { description: { $regex: regex } },
          { category: { $regex: regex } },
        ],
      })
      .limit(20)
      .toArray();

    const mapped = products.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      price: p.price,
      image: p.imageUrl || p.image,
      slug: p.slug,
      category: p.category,
      description: p.description,
    }));

    return res.status(200).json(mapped);
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Failed to search products" });
  }
}
