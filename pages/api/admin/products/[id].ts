// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { File as FormidableFile } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/products";

// Try to import storefront helpers (optional, runtime-safe)
let storefrontNormalizeProduct: ((doc: any) => any) | null = null;
try {
  const lib = require("@/lib/products");
  storefrontNormalizeProduct = lib.normalizeProduct || null;
} catch {
  // ignore
}

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

/** ---------------- Fallback normalizer (same as index) ---------------- */
function inferDepartment(doc: any): "jewelry" | "watch" {
  const d = String(doc?.department || "").toLowerCase();
  if (d === "watch") return "watch";
  const cat = String(doc?.category || "").toLowerCase();
  if (cat === "watch" || cat === "watches") return "watch";
  return "jewelry";
}
function firstImage(doc: any): string {
  if (doc?.imageUrl) return String(doc.imageUrl);
  if (Array.isArray(doc?.images) && doc.images.length)
    return String(doc.images[0]);
  if (doc?.image) return String(doc.image);
  return "";
}
function fallbackNormalizeProduct(doc: any) {
  const subCategory = doc?.subCategory ?? doc?.subcategory ?? undefined;
  const name = doc?.name ?? doc?.title ?? "";
  return {
    ...doc,
    name,
    department: inferDepartment(doc),
    subCategory,
    imageUrl: firstImage(doc),
  };
}
const normalizeProduct = (doc: any) =>
  (storefrontNormalizeProduct ? storefrontNormalizeProduct(doc) : null) ||
  fallbackNormalizeProduct(doc);

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

function publicIdFromUrl(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const after = u.pathname.split("/upload/")[1]; // v123/.../folder/name.jpg
    if (!after) return null;
    const noVersion = after.replace(/^v\d+\//, "");
    return noVersion.replace(/\.[a-z0-9]+$/i, ""); // folder/name
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin)
    return res.status(403).json({ error: "Forbidden" });

  const { id } = req.query;
  if (typeof id !== "string" || !ObjectId.isValid(id))
    return res.status(400).json({ error: "Invalid id" });

  const db = await getDb();
  const products = db.collection("products");
  const _id = new ObjectId(id);

  // ---------- GET one (normalized) ----------
  if (req.method === "GET") {
    const doc = await products.findOne({ _id });
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ product: normalizeProduct(doc) });
  }

  // ---------- PUT: update (multipart + Cloudinary) ----------
  if (req.method === "PUT") {
    try {
      const existing = await products.findOne({ _id });
      if (!existing) return res.status(404).json({ error: "Not found" });

      const { fields, files } = await parseForm(req);

      const update: any = {};
      if (fields.name !== undefined) {
        update.name = String(fields.name).trim();
        update.title = update.name; // keep legacy in sync
      }
      if (fields.description !== undefined)
        update.description = String(fields.description);
      if (fields.price !== undefined) update.price = Number(fields.price);
      if (fields.salePrice !== undefined && String(fields.salePrice) !== "")
        update.salePrice = Number(fields.salePrice);
      if (fields.salePrice !== undefined && String(fields.salePrice) === "")
        update.salePrice = undefined;
      if (fields.category !== undefined)
        update.category = String(fields.category);
      if (fields.subcategory !== undefined) {
        const s = String(fields.subcategory).trim();
        update.subCategory = s || undefined; // store as subCategory
      }
      if (fields.featured !== undefined)
        update.featured = String(fields.featured) === "true";
      if (fields.gender !== undefined)
        update.gender = String(fields.gender) as "unisex" | "him" | "her";

      if (update.category) {
        update.department =
          update.category === "watches" || update.category === "watch"
            ? "watch"
            : "jewelry";
      }

      const imageRemoved = String(fields.imageRemoved || "") === "true";
      const imageFile = files.image as FormidableFile | undefined;

      // remove existing image if requested
      if (imageRemoved && !imageFile) {
        const pub = publicIdFromUrl(existing.imageUrl);
        if (pub) {
          try {
            await cloudinary.uploader.destroy(pub);
          } catch (e) {
            console.warn("destroy (remove) failed", e);
          }
        }
        update.imageUrl = "";
        update.images = [];
      }

      // replace with new upload
      if (imageFile?.filepath) {
        const pub = publicIdFromUrl(existing.imageUrl);
        if (pub) {
          try {
            await cloudinary.uploader.destroy(pub);
          } catch (e) {
            console.warn("destroy (replace) failed", e);
          }
        }
        const upload = await cloudinary.uploader.upload(imageFile.filepath, {
          folder: "classy-diamonds/products",
          resource_type: "image",
        });
        update.imageUrl = upload.secure_url;
        update.images = [upload.secure_url]; // mirror for legacy readers
      }

      if (Object.keys(update).length === 0) {
        const fresh = await products.findOne({ _id });
        return res.status(200).json({ product: normalizeProduct(fresh) });
      }

      update.updatedAt = new Date();
      await products.updateOne({ _id }, { $set: update });
      const saved = await products.findOne({ _id });
      return res.status(200).json({ product: normalizeProduct(saved) });
    } catch (e: any) {
      console.error("update product error", e);
      return res.status(400).json({ error: e?.message || "Update failed" });
    }
  }

  // ---------- DELETE ----------
  if (req.method === "DELETE") {
    try {
      const doc = await products.findOne({ _id });
      if (!doc) return res.status(404).json({ error: "Not found" });

      const pub = publicIdFromUrl(doc.imageUrl);
      if (pub) {
        try {
          await cloudinary.uploader.destroy(pub);
        } catch (e) {
          console.warn("destroy (delete) failed", e);
        }
      }

      await products.deleteOne({ _id });
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      console.error("delete product error", e);
      return res.status(400).json({ error: e?.message || "Delete failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
