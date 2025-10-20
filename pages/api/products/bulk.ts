// pages/api/products/bulk.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getProductsBySlugs } from "@/lib/products";

export const runtime = "nodejs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    let slugs: string[] = [];

    if (req.method === "GET") {
      const raw = (req.query.slugs as string | undefined) || "";
      slugs = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      slugs = Array.isArray(body?.slugs) ? body.slugs : [];
    } else {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    if (!slugs.length) {
      return res.status(200).json([]);
    }

    const products = await getProductsBySlugs(slugs);
    // Return only what the client needs
    return res.status(200).json(products);
  } catch (err) {
    console.error("[/api/products/bulk] error", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
