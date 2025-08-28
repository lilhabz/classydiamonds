// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import {
  getDbProductById,
  updateDbProductById,
  deleteDbProductById,
} from "@/lib/productAdapter";

// IMPORTANT:
// - This route is JSON-only (no multipart uploads, no bodyParser override).
// - Keep uploads (Cloudinary/formidable) in a SEPARATE route like
//   /api/admin/products/upload.ts if you need that functionality.

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Admin auth
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const { id } = req.query as { id?: string };
  if (!id) {
    return res.status(400).json({ ok: false, error: "Missing id" });
  }

  try {
    if (req.method === "GET") {
      const item = await getDbProductById(id);
      if (!item) {
        // If user requested a legacy (array-based) product id, it won't exist in DB.
        return res.status(404).json({
          ok: false,
          error:
            "Not found. If this was a legacy product from static arrays, migrate it into the database from the Admin list.",
        });
      }
      return res.status(200).json({ ok: true, item });
    }

    if (req.method === "PATCH") {
      // JSON patch only
      const patch = (req.body ?? {}) as Record<string, unknown>;
      const updated = await updateDbProductById(id, patch);
      if (!updated) {
        return res.status(404).json({
          ok: false,
          error:
            "Not found for update. Legacy products must be migrated to DB before editing.",
        });
      }
      return res.status(200).json({ ok: true, item: updated });
    }

    if (req.method === "DELETE") {
      const removed = await deleteDbProductById(id);
      if (!removed) {
        return res
          .status(404)
          .json({ ok: false, error: "Not found for delete." });
      }
      return res.status(200).json({ ok: true, item: removed });
    }

    res.setHeader("Allow", "GET,PATCH,DELETE");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (err: any) {
    console.error("Admin products [id] error:", err);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
