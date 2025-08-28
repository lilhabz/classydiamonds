// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import {
  getAllMergedProducts,
  createDbProduct,
  AdminProduct,
} from "@/lib/productAdapter";

// NOTE:
// - This route is JSON-only. Do NOT disable bodyParser here.
// - File uploads (Cloudinary, multipart/form-data) should be handled by a SEPARATE route,
//   e.g. /pages/api/admin/products/upload.ts, if/when you need it.

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Admin auth (unchanged behavior)
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  try {
    if (req.method === "GET") {
      // Return a unified list: DB products + legacy array products (normalized)
      const items = await getAllMergedProducts();
      return res.status(200).json({ ok: true, items });
    }

    if (req.method === "POST") {
      // Create a NEW DB product (legacy items remain read-only)
      const payload = req.body as Partial<AdminProduct>;

      // Minimal validation
      const name = (payload?.name || "").trim();
      const category = (payload?.category || "").trim();
      const price = Number(payload?.price);

      if (!name || !category || !Number.isFinite(price)) {
        return res.status(400).json({
          ok: false,
          error:
            "Missing or invalid fields: name, price, category are required",
        });
      }

      const created = await createDbProduct({
        name,
        slug: payload?.slug, // will be generated if missing
        price,
        salePrice: payload?.salePrice ?? null,
        category,
        subcategory: payload?.subcategory ?? null,
        imageUrl: payload?.imageUrl ?? "/gray-placeholder.jpg",
        archived: Boolean(payload?.archived),
      });

      return res.status(201).json({ ok: true, item: created });
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (err: any) {
    console.error("Admin products index error:", err);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
