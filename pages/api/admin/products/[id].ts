// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import formidable from "formidable";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

const PRIMARY_COLLECTION =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return null;
  }
  return session as any;
}

function makeIdFilter(idParam: string | string[] | undefined) {
  const raw =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
      ? idParam[0]
      : "";
  if (!raw) return null;
  const ors: any[] = [{ _id: raw }];
  try {
    ors.push({ _id: new ObjectId(raw) });
  } catch {}
  return ors.length === 1 ? ors[0] : { $or: ors };
}

function parseForm(req: NextApiRequest) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024,
  });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
    (resolve, reject) => {
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      );
    }
  );
}

const s = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: any) => {
  if (v == null || v === "") return undefined;
  const num =
    typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(num) ? num : undefined;
};
function toBool(v: any) {
  const x = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!x) return false;
  if (["1", "true", "yes", "on"].includes(x)) return true;
  if (["0", "false", "no", "off"].includes(x)) return false;
  return false;
}
function toAudience(v: any): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return [v];
  }
  return ["unisex"];
}
function toSpecs(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    const parsed = JSON.parse(String(v));
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const db = await getDb();
  const idFilter = makeIdFilter(req.query.id);
  if (!idFilter)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  const collectionsToQuery = Array.from(
    new Set([PRIMARY_COLLECTION, "products"])
  );

  if (req.method === "GET") {
    for (const colName of collectionsToQuery) {
      try {
        const found = await db.collection(colName).findOne(idFilter as any);
        if (found) {
          return res
            .status(200)
            .json({ ok: true, product: found, collection: colName });
        }
      } catch {}
    }
    try {
      const legacy = await db
        .collection("legacyProducts")
        .findOne(idFilter as any);
      if (legacy) {
        return res.status(200).json({
          ok: true,
          product: legacy,
          note: "Served from legacyProducts",
        });
      }
    } catch {}
    return res.status(404).json({ ok: false, error: "Product not found" });
  }

  if (req.method === "PUT") {
    try {
      const { fields, files } = await parseForm(req);

      // Build update from fields (mirror ProductForm)
      const patch: any = {
        updatedAt: new Date(),
      };

      if ("title" in fields || "name" in fields) {
        const title = s(fields.title ?? fields.name);
        if (title) {
          patch.title = title;
          patch.name = title;
        }
      }
      if ("department" in fields) {
        const d = s(fields.department);
        if (d === "watch" || d === "jewelry") patch.department = d;
      }
      if ("category" in fields)
        patch.category = s(fields.category) || undefined;
      if ("subCategory" in fields || "subcategory" in fields)
        patch.subCategory = s(fields.subCategory ?? fields.subcategory) || null;

      if ("unitPrice" in fields || "price" in fields) {
        const price = n(fields.unitPrice ?? fields.price);
        if (price != null) {
          patch.price = price;
          patch.unitPrice = price;
        }
      }
      if ("salePrice" in fields) {
        patch.salePrice =
          fields.salePrice == null ? null : n(fields.salePrice) ?? null;
      }
      if ("description" in fields) {
        patch.description = s(fields.description);
      }
      if ("archived" in fields) {
        patch.archived = toBool(fields.archived);
      }
      if ("audience" in fields) {
        patch.audience = toAudience(fields.audience);
      }
      if ("specs" in fields) {
        patch.specs = toSpecs(fields.specs);
      }

      // 🆕 stock: only set if provided to avoid unintended overwrite
      if ("inStock" in fields) {
        patch.inStock = toBool(fields.inStock);
      }

      // 🆕 featured: only set if provided — and enforce max 4 when turning on
      if ("featured" in fields) {
        const desiredFeatured = toBool(fields.featured);
        if (desiredFeatured) {
          // Resolve current document in the PRIMARY_COLLECTION to exclude it in the count
          const current = await db
            .collection(PRIMARY_COLLECTION)
            .findOne(idFilter as any);
          const excludeId =
            current?._id instanceof ObjectId ? current._id : current?._id;

          const currentFeaturedCount = await db
            .collection(PRIMARY_COLLECTION)
            .countDocuments({
              featured: true,
              ...(excludeId ? { _id: { $ne: excludeId } } : {}),
            });

          if (currentFeaturedCount >= 4) {
            return res
              .status(409)
              .json({ ok: false, error: "Featured limit reached (max 4)." });
          }
        }
        patch.featured = desiredFeatured;
      }

      // Image handling
      const file: any = (files as any)?.image;
      const imageRemoved = toBool(fields.imageRemoved);
      if (imageRemoved) {
        patch.imageUrl = null;
        patch.images = [];
      } else if (file?.filepath) {
        const upload = await cloudinary.uploader.upload(file.filepath, {
          folder: "classy-products",
          overwrite: true,
          resource_type: "image",
        });
        patch.imageUrl = upload.secure_url;
        patch.images = [upload.secure_url];
      }

      for (const colName of collectionsToQuery) {
        try {
          const { value } = await db
            .collection(colName)
            .findOneAndUpdate(
              idFilter as any,
              { $set: patch },
              { returnDocument: "after" }
            );
          if (value) {
            return res
              .status(200)
              .json({ ok: true, product: value, collection: colName });
          }
        } catch {}
      }
      return res.status(404).json({ ok: false, error: "Product not found" });
    } catch (e: any) {
      console.error("update error:", e);
      return res
        .status(500)
        .json({ ok: false, error: e?.message || "Update failed" });
    }
  }

  if (req.method === "DELETE") {
    for (const colName of collectionsToQuery) {
      try {
        const result = await db.collection(colName).deleteOne(idFilter as any);
        if (result.deletedCount) {
          return res
            .status(200)
            .json({ ok: true, deleted: true, collection: colName });
        }
      } catch {}
    }
    return res.status(404).json({ ok: false, error: "Product not found" });
  }

  res.setHeader("Allow", "GET,PUT,DELETE");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
