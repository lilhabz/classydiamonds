// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { File as FormidableFile } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/products";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

// ---------- small helpers ----------
function toStr(v: any): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s : undefined;
}
function parseJson<T>(v: any, fallback: T): T {
  const s = toStr(v);
  if (!s) return fallback;
  try {
    const parsed = JSON.parse(s);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
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

// ---------- normalization (same as index) ----------
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
function normalizeDoc(doc: any) {
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
function publicIdFromUrl(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const after = u.pathname.split("/upload/")[1];
    if (!after) return null;
    const noVersion = after.replace(/^v\d+\//, "");
    return noVersion.replace(/\.[a-z0-9]+$/i, "");
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

  // ---------- GET one ----------
  if (req.method === "GET") {
    const doc = await products.findOne({ _id });
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ product: normalizeDoc(doc) });
  }

  // ---------- PUT: update (multipart + Cloudinary + URL images merge) ----------
  if (req.method === "PUT") {
    try {
      const existing = await products.findOne({ _id });
      if (!existing) return res.status(404).json({ error: "Not found" });

      // If the request is JSON (batch featured), handle quickly
      if (req.headers["content-type"]?.includes("application/json")) {
        let body = "";
        await new Promise<void>((resolve) => {
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => resolve());
        });
        const patch = JSON.parse(body || "{}");
        const update: any = {};
        if (typeof patch.featured === "boolean")
          update.featured = patch.featured;
        if (Object.keys(update).length === 0) {
          const fresh = await products.findOne({ _id });
          return res.status(200).json({ product: normalizeDoc(fresh) });
        }
        update.updatedAt = new Date();
        await products.updateOne({ _id }, { $set: update });
        const saved = await products.findOne({ _id });
        return res.status(200).json({ product: normalizeDoc(saved) });
      }

      // Otherwise, multipart update
      const { fields, files } = await parseForm(req);

      const update: any = {};

      // Strings & numbers
      if (fields.name !== undefined) {
        update.name = String(fields.name).trim();
        update.title = update.name;
      }
      if (fields.description !== undefined)
        update.description = String(fields.description);

      if (fields.price !== undefined) {
        const p = Number(String(fields.price));
        if (!Number.isNaN(p)) update.price = p;
      }

      if (fields.salePrice !== undefined) {
        const s = String(fields.salePrice);
        update.salePrice = s === "" ? undefined : Number(s);
      }

      if (fields.category !== undefined)
        update.category = String(fields.category).trim();

      // Accept subcategory/subCategory
      if (fields.subcategory !== undefined || fields.subCategory !== undefined) {
        const s = String(fields.subcategory ?? fields.subCategory).trim();
        update.subCategory = s || undefined;
      }

      if (fields.featured !== undefined)
        update.featured = String(fields.featured) === "true";

      if (fields.gender !== undefined)
        update.gender = String(fields.gender) as "unisex" | "him" | "her";

      // Department override or infer from category if changed
      if (fields.department !== undefined) {
        const d = String(fields.department).toLowerCase();
        if (d === "watch" || d === "jewelry") update.department = d;
      } else if (update.category) {
        update.department =
          update.category === "watches" || update.category === "watch"
            ? "watch"
            : "jewelry";
      }

      // audience (JSON array) optional
      if (fields.audience !== undefined) {
        const arr = parseJson<string[]>(fields.audience, []);
        if (Array.isArray(arr) && arr.length) {
          update.audience = arr;
        } else {
          update.audience = ["unisex"];
        }
      }

      // specs (JSON object) optional
      if (fields.specs !== undefined) {
        try {
          const obj = JSON.parse(String(fields.specs));
          update.specs = obj && typeof obj === "object" ? obj : {};
        } catch {
          update.specs = {};
        }
      }

      // image operations
      const imageRemoved = String(fields.imageRemoved || "") === "true";
      const imageFile = files.image as FormidableFile | undefined;

      // URL images provided (JSON array via images or imageUrls)
      const urlImages =
        parseJson<string[]>(fields.images, []) ||
        parseJson<string[]>(fields.imageUrls, []) ||
        [];

      // Build final images list
      let images: string[] | undefined;

      // Start from existing images unless explicitly removed
      const existingImages: string[] = Array.isArray(existing.images)
        ? existing.images
        : (existing.imageUrl ? [existing.imageUrl] : []);

      if (imageRemoved && !imageFile && urlImages.length === 0) {
        // remove only
        const pub = publicIdFromUrl(existing.imageUrl);
        if (pub) {
          try {
            await cloudinary.uploader.destroy(pub);
          } catch (e) {
            console.warn("destroy (remove) failed", e);
          }
        }
        images = [];
      } else {
        images = [];

        // If replacing, remove old cloudinary asset
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
          images.push(upload.secure_url);
        }

        // If not explicitly removed, keep existing images (unless we already replaced above and you want a pure replace;
        // we keep them to allow multiple gallery URLs)
        if (!imageRemoved) {
          images.push(...existingImages);
        }

        // Append any new URL images
        if (urlImages.length) {
          images.push(...urlImages.map(String).filter(Boolean));
        }

        // De-duplicate while preserving order
        images = Array.from(new Set(images));
      }

      // If we touched images in any way, set imageUrl and images
      if (imageRemoved || imageFile?.filepath || urlImages.length > 0) {
        update.images = images;
        update.imageUrl = images.length ? images[0] : "";
      }

      if (Object.keys(update).length === 0) {
        const fresh = await products.findOne({ _id });
        return res.status(200).json({ product: normalizeDoc(fresh) });
      }

      update.updatedAt = new Date();
      await products.updateOne({ _id }, { $set: update });
      const saved = await products.findOne({ _id });
      return res.status(200).json({ product: normalizeDoc(saved) });
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
