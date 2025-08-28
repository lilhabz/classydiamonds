// pages/api/admin/products/migrate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createDbProduct, AdminProduct } from "@/lib/productAdapter";

// This route receives a legacy item's fields and creates a DB product (idempotent by slug on client side).

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    const payload = req.body as Partial<AdminProduct>;
    if (!payload?.name || payload.price == null || !payload.category) {
      return res
        .status(400)
        .json({ ok: false, error: "name, price, category are required" });
    }

    const created = await createDbProduct(payload);
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    console.error("Migrate legacy error:", err);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
