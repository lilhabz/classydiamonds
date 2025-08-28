// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import {
  getDbProductById,
  updateDbProductById,
  deleteDbProductById,
} from "@/lib/productAdapter";

// JSON-only handler (no bodyParser override)
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user?.isAdmin)
    return res.status(403).json({ ok: false, error: "Forbidden" });

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ ok: false, error: "Missing id" });

  try {
    if (req.method === "GET") {
      const item = await getDbProductById(id);
      if (!item) {
        return res.status(404).json({
          ok: false,
          error:
            "Not found. If this was a legacy product, migrate it into the database from the Admin list.",
        });
      }
      return res.status(200).json({ ok: true, item });
    }

    if (req.method === "PATCH") {
      const patch = (req.body ?? {}) as Record<string, unknown>;
      const updated = await updateDbProductById(id, patch);
      if (!updated) {
        return res
          .status(404)
          .json({ ok: false, error: "Not found (or legacy). Migrate first." });
      }
      return res.status(200).json({ ok: true, item: updated });
    }

    if (req.method === "DELETE") {
      const removed = await deleteDbProductById(id);
      if (!removed)
        return res.status(404).json({ ok: false, error: "Not found" });
      return res.status(200).json({ ok: true, item: removed });
    }

    res.setHeader("Allow", "GET,PATCH,DELETE");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (err: any) {
    console.error("Admin products [id] error:", err);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
