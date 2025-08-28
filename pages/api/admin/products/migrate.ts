// pages/api/admin/products/migrate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { createDbProduct, AdminProduct } from "@/lib/productAdapter";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user?.isAdmin)
    return res.status(403).json({ ok: false, error: "Forbidden" });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = req.body as Partial<AdminProduct>;
    const name = (body.name || "").trim();
    const category = (body.category || "").trim();
    const price = Number(body.price);
    if (!name || !category || !Number.isFinite(price)) {
      return res
        .status(400)
        .json({ ok: false, error: "name, price, category are required" });
    }
    const created = await createDbProduct({
      name,
      slug: body.slug,
      price,
      salePrice: body.salePrice ?? null,
      category,
      subcategory: body.subcategory ?? null,
      imageUrl: body.imageUrl ?? "/gray-placeholder.jpg",
      archived: Boolean(body.archived),
      specs: body.specs ?? {},
      audience: body.audience ?? ["unisex"],
    });
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    console.error("Migrate error", err);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
