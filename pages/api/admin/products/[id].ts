// 📄 pages/api/admin/products/[id].ts – Update & Delete a single product
// ✅ Supports multipart *and* JSON updates
// ✅ Moves deleted/replaced images to Cloudinary backup
// ✅ Regenerates slug on name change, unsets salePrice when cleared
// ✅ NEW: Handles `subcategory` (JSON + multipart), normalized to slug

import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { IncomingForm, File } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";

export const config = { api: { bodyParser: false } };

type Product = {
  _id: ObjectId;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  category: string;
  subcategory?: string; // ✅ added
  slug: string;
  imageUrl: string; // may be ""
  featured: boolean;
  gender?: "unisex" | "him" | "her";
  tags: string[];
  createdAt: Date;
};

type Data =
  | { success: true; product?: Product; deleted?: boolean }
  | { success: false; message: string };

// --- Cloudinary config (safe if envs missing; uploads just won’t run) ---
const hasCloud =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (hasCloud) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });
}

// ------- Utils -------
function getString(val: any, fallback = ""): string {
  if (Array.isArray(val)) return (val[0] ?? fallback) as string;
  if (typeof val === "string") return val;
  return fallback;
}
const toSlug = (s: string) => slugify(s, { lower: true, strict: true });

// Formidable returns a map of arrays; define a safe indexable type
type AnyFiles = Record<string, File[] | undefined>;

async function parseMultipart(
  req: NextApiRequest
): Promise<{ fields: Record<string, any>; files: AnyFiles }> {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 20 * 1024 * 1024, // 20MB
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files: files as AnyFiles })
    );
  });
}

async function parseJsonBody<T = any>(req: NextApiRequest): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

// Extract a Cloudinary public_id from a secure_url
function extractPublicIdFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // expect .../upload/(v12345/)?<folder(s)>/<file>.<ext>
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx === -1) return null;
    const afterUpload = parts.slice(uploadIdx + 1); // e.g. ["v12345","classy-diamonds","original","abcd.jpg"]
    if (!afterUpload.length) return null;

    // Remove version if present (starts with 'v' + digits)
    const first = afterUpload[0];
    const startIdx = /^v\d+$/i.test(first) ? 1 : 0;
    const noVersion = afterUpload.slice(startIdx);

    if (!noVersion.length) return null;
    const last = noVersion.pop()!; // "file.ext"
    const filenameNoExt = last.includes(".")
      ? last.slice(0, last.lastIndexOf("."))
      : last;
    const folder = noVersion.length ? noVersion.join("/") + "/" : "";
    return folder + filenameNoExt; // e.g. "classy-diamonds/original/abcd"
  } catch {
    return null;
  }
}

// Move current image to backup folder (rename)
async function moveToBackup(imageUrl?: string) {
  if (!hasCloud || !imageUrl) return;
  const publicId = extractPublicIdFromUrl(imageUrl);
  if (!publicId) return;
  try {
    // turn "classy-diamonds/original/abcd" -> "classy-diamonds/backup/abcd"
    const backupId = publicId
      .replace(/(^|\/)original(\/|$)/, (_m, a, b) => `${a}backup${b}`)
      .replace(
        /^classy-diamonds\/(?!original|backup)/,
        "classy-diamonds/backup/"
      ); // safety
    await cloudinary.uploader.rename(publicId, backupId);
  } catch (e) {
    // best-effort; do not block
    console.warn("Cloudinary moveToBackup failed:", e);
  }
}

// Optional upload helper
async function uploadNewImage(filepath: string): Promise<string> {
  if (!hasCloud) return "";
  const res = await cloudinary.uploader.upload(filepath, {
    folder: "classy-diamonds/original",
    transformation: [
      { crop: "fill", width: 1200, height: 1200 },
      { fetch_format: "auto" },
      { quality: "auto" },
    ],
    resource_type: "image",
    overwrite: false,
  });
  return res.secure_url;
}

// --------------------------------- Handler ---------------------------------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { id } = req.query;
  if (!id || typeof id !== "string" || !ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<Product>("products");
  const filter = { _id: new ObjectId(id) };

  if (req.method === "PUT") {
    try {
      const contentType = req.headers["content-type"] || "";

      // Load existing product early (needed for image moves / slug rename logic)
      const existing = await collection.findOne(filter);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      let updates: Partial<Product> = {};
      let unset: Record<string, "" | true> = {};

      if (contentType.includes("application/json")) {
        // 🔁 Batch or JSON edit
        const body = await parseJsonBody<Record<string, any>>(req);

        // Common single-field updates
        if (typeof body.featured === "boolean") {
          updates.featured = body.featured;
        }
        if (typeof body.name === "string") {
          updates.name = body.name.trim();
          if (updates.name && updates.name !== existing.name) {
            updates.slug = slugify(updates.name, { lower: true, strict: true });
          }
        }
        if (typeof body.description === "string")
          updates.description = body.description.trim();

        if (typeof body.price !== "undefined") {
          const pr = Number(body.price);
          if (!Number.isNaN(pr)) updates.price = pr;
        }
        if (typeof body.salePrice !== "undefined") {
          if (body.salePrice === "" || body.salePrice === null) {
            unset.salePrice = ""; // remove if cleared
          } else {
            const sp = Number(body.salePrice);
            if (!Number.isNaN(sp)) updates.salePrice = sp;
          }
        }
        if (typeof body.category === "string")
          updates.category = body.category.trim();

        // ✅ NEW: subcategory (JSON)
        if (typeof body.subcategory !== "undefined") {
          const rawSub = String(body.subcategory || "").trim();
          if (rawSub) {
            updates.subcategory = toSlug(rawSub);
          } else {
            unset.subcategory = ""; // clear if set to empty
          }
        }

        if (
          body.gender === "him" ||
          body.gender === "her" ||
          body.gender === "unisex"
        ) {
          updates.gender = body.gender;
        }
        // no image handling in JSON path
      } else {
        // 🧾 Multipart form path (Edit form)
        const { fields, files } = await parseMultipart(req);

        const name = getString(fields.name).trim();
        const description = getString(fields.description).trim();
        const priceStr = getString(fields.price, "").trim();
        const salePriceStr = getString(fields.salePrice, "").trim();
        const category = getString(fields.category).trim();
        const featured = getString(fields.featured, "false") === "true";
        const genderStr = getString(fields.gender, "unisex");
        const imageRemoved = getString(fields.imageRemoved, "false") === "true";

        // ✅ NEW: subcategory (multipart)
        const rawSub = getString(fields.subcategory).trim();
        if (rawSub) {
          updates.subcategory = toSlug(rawSub);
        } else if (typeof fields.subcategory !== "undefined") {
          // explicit clear if field exists but empty
          unset.subcategory = "";
        }

        if (name) {
          updates.name = name;
          if (name !== existing.name) {
            updates.slug = slugify(name, { lower: true, strict: true });
          }
        }
        if (description) updates.description = description;

        if (priceStr !== "") {
          const p = parseFloat(priceStr);
          if (!Number.isNaN(p)) updates.price = p;
        }

        if (salePriceStr !== "") {
          const sp = parseFloat(salePriceStr);
          if (!Number.isNaN(sp)) updates.salePrice = sp;
        } else {
          // explicit clear
          unset.salePrice = "";
        }

        if (category) updates.category = category;
        updates.featured = featured;
        updates.gender = (
          ["him", "her", "unisex"].includes(genderStr) ? genderStr : "unisex"
        ) as "him" | "her" | "unisex";

        // Handle image removal first
        if (imageRemoved && existing.imageUrl) {
          await moveToBackup(existing.imageUrl);
          updates.imageUrl = "";
        }

        // Handle new image upload
        const imageArr = (files as AnyFiles)["image"]; // File[] | undefined
        const imageFile = imageArr?.[0]; // File | undefined
        if (imageFile && (imageFile as any).filepath) {
          // If we already had one, move old to backup, then upload new
          if (existing.imageUrl) {
            await moveToBackup(existing.imageUrl);
          }
          const newUrl = await uploadNewImage((imageFile as any).filepath);
          updates.imageUrl = newUrl;
        }
      }

      // Build update doc without undefined values
      const $set: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (typeof v !== "undefined") $set[k] = v;
      }

      const updateDoc: any = {};
      if (Object.keys($set).length) updateDoc.$set = $set;
      if (Object.keys(unset).length) updateDoc.$unset = unset;

      if (!Object.keys(updateDoc).length) {
        // nothing to change
        const unchanged = await collection.findOne(filter);
        return res.status(200).json({ success: true, product: unchanged! });
      }

      await collection.updateOne(filter, updateDoc);
      const updated = await collection.findOne(filter);
      return res.status(200).json({ success: true, product: updated! });
    } catch (err: any) {
      console.error("PUT /api/admin/products/[id] Error:", err);
      return res
        .status(500)
        .json({ success: false, message: err?.message || "Server error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const existing = await collection.findOne(filter);
      if (existing?.imageUrl) {
        await moveToBackup(existing.imageUrl);
      }
      await collection.deleteOne(filter);
      return res.status(200).json({ success: true, deleted: true });
    } catch (err: any) {
      console.error("DELETE /api/admin/products/[id] Error:", err);
      return res
        .status(500)
        .json({ success: false, message: err?.message || "Server error" });
    }
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res
    .status(405)
    .json({ success: false, message: `Method ${req.method} Not Allowed` });
}
