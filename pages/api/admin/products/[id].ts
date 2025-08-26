// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getProductById, updateProduct, deleteProduct } from "@/lib/products";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  if (req.method === "GET") {
    const product = await getProductById(id);
    if (!product) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ product });
  }

  if (req.method === "PUT") {
    try {
      const updated = await updateProduct(id, req.body);
      if (!updated) return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ product: updated });
    } catch (e: any) {
      console.error("update product error", e);
      return res.status(400).json({ error: e?.message || "Update failed" });
    }
  }

  if (req.method === "DELETE") {
    const ok = await deleteProduct(id);
    return res.status(200).json({ ok });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
