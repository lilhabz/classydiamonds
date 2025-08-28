// /pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { getAllProductsMerged } from "@/lib/productsAdapter";

type ApiResp =
  | { ok: true; items?: any[]; product?: any; id?: string }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp>
) {
  // Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET,POST,OPTIONS");
    return res.status(204).end();
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !(session.user as any).isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const DB_NAME = process.env.MONGODB_DB;
    if (!DB_NAME)
      return res
        .status(500)
        .json({ ok: false, error: "MONGODB_DB env var not set" });
    const COLL = process.env.PRODUCTS_COLLECTION || "products";
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLL);

    if (req.method === "GET") {
      const items = await getAllProductsMerged();
      return res.status(200).json({ ok: true, items });
    }

    if (req.method === "POST") {
      const {
        name,
        price,
        salePrice,
        category,
        subcategory,
        imageUrl,
        audience,
        specs,
        description,
        department,
      } = (req.body ?? {}) as Record<string, any>;

      const priceNum =
        typeof price === "number"
          ? price
          : typeof price === "string" && price.trim() !== ""
          ? Number(price)
          : null;

      const saleNum =
        typeof salePrice === "number"
          ? salePrice
          : typeof salePrice === "string" && salePrice.trim() !== ""
          ? Number(salePrice)
          : null;

      const now = new Date();
      const doc = {
        name: name ?? "",
        description: description ?? "",
        price: priceNum,
        salePrice: saleNum,
        category: category ?? null,
        subcategory: subcategory ?? null,
        imageUrl: imageUrl ?? "/gray-placeholder.jpg",
        audience:
          Array.isArray(audience) && audience.length ? audience : ["unisex"],
        specs: specs && typeof specs === "object" ? specs : {},
        department: department ?? "jewelry",
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(doc);
      return res.status(200).json({
        ok: true,
        id: result.insertedId.toString(),
        product: { _id: result.insertedId, ...doc },
      });
    }

    res.setHeader("Allow", "GET,POST,OPTIONS");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (err: any) {
    console.error("Admin products API error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Server error" });
  }
}
