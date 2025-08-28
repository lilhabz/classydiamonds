// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { getDb } from "@/lib/products";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

// ---------- helpers ----------
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
function parseNumberLike(v: any, d = 0): number {
  const s = toStr(v);
  if (!s) return d;
  const n = Number(s);
  return Number.isFinite(n) ? n : d;
}

// ---------- legacy normalization helpers ----------
function inferDepartment(doc: any): "jewelry" | "watch" {
  const d = String(doc?.department || "").toLowerCase();
  if (d === "watch") return "watch";
  const cat = String(doc?.category || "").toLowerCase();
  if (cat === "watch" || cat === "watches") return "watch";
  return "jewelry";
}
function firstImage(doc: any): string {
  if (doc?.imageUrl) return String(doc.imageUrl);
  if (Array.isArray(doc?.images) && doc.images.length) return String(doc.images[0]);
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // ----------------- GET -----------------
  if (req.method === "GET") {
    try {
      const db = await getDb();
      const { department, category, subCategory, q, audience, specs } = req.query;

      const filter: any = {};

      if (typeof department === "string" && department) {
        filter.$or = [
          ...(filter.$or || []),
          { department },
          { category: department }, // legacy
        ];
      }
      if (typeof category === "string" && category) filter.category = category;

      if (typeof subCategory === "string" && subCategory) {
        filter.$or = [
          ...(filter.$or || []),
          { subCategory },
          { subcategory: subCategory }, // legacy casing
        ];
      }

      if (typeof q === "string" && q.trim()) {
        filter.$or = [
          ...(filter.$or || []),
          { name: { $regex: q, $options: "i" } },
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { tags: { $regex: q, $options: "i" } }, // tolerate legacy "tags"
        ];
      }

      if (typeof audience === "string" && audience) {
        const a = audience
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (a.length) {
          filter.$expr = {
            $gt: [
              {
                $size: {
                  $setIntersection: [{ $ifNull: ["$audience", ["unisex"]] }, a],
                },
              },
              0,
            ],
          };
        }
      }

      if (typeof specs === "string" && specs) {
        try {
          const wanted = JSON.parse(specs);
          const and: any[] = [];
          for (const [k, v] of Object.entries(wanted)) {
            and.push({ [`specs.${k}`]: v });
          }
          if (and.length) filter.$and = [...(filter.$and || []), ...and];
        } catch {
          // ignore bad JSON
        }
      }

      const raw = await db
        .collection("products")
        .find(Object.keys(filter).length ? filter : {})
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      const products = raw.map(normalizeDoc);
      return res.status(200).json({ products });
    } catch (e: any) {
      console.error("GET products error", e);
      return res.status(500).json({ error: "Failed to load products" });
    }
  }

  // ----------------- POST: create (multipart + Cloudinary + URL images) -----------------
  if (req.method === "POST") {
    try {
      const db = await getDb();
      const { fields, files } = await parseForm(req);

      // strings
      const _title = toStr(fields.title);
      const _name = toStr(fields.name);
      const name = (_name || _title || "").trim();
      const description = toStr(fields.description) || "";
      const category = (toStr(fields.category) || "").trim();
      const subCategory = (toStr(fields.subCategory) || toStr(fields.subcategory) || "").trim();

      const price = parseNumberLike(fields.price ?? fields.unitPrice, 0);
      const salePrice = toStr(fields.salePrice);
      const featured = (toStr(fields.featured) || "") === "true";

      // allow incoming department override; else infer from category
      const incomingDept = (toStr(fields.department) || "").toLowerCase();
      const department =
        incomingDept === "watch" || incomingDept === "jewelry"
          ? (incomingDept as "watch" | "jewelry")
          : category.toLowerCase().includes("watch")
          ? "watch"
          : "jewelry";

      // arrays/objects
      const audience =
        parseJson<string[]>(fields.audience, [])?.filter(Boolean) || ["unisex"];
      const specs =
        parseJson<Record<string, any>>(fields.specs, {}) || undefined;

      // merge any URL images (JSON array) + uploaded file
      const urlImages =
        parseJson<string[]>(fields.images, []) ||
        parseJson<string[]>(fields.imageUrls, []) ||
        [];

      const imageFile = files.image as FormidableFile | undefined;

      let images: string[] = [];
      if (imageFile?.filepath) {
        const upload = await cloudinary.uploader.upload(imageFile.filepath, {
          folder: "classy-diamonds/products",
          resource_type: "image",
        });
        images.push(upload.secure_url);
      }
      if (Array.isArray(urlImages) && urlImages.length) {
        images.push(...urlImages.map(String).filter(Boolean));
      }
      // dedupe while preserving order
      images = Array.from(new Set(images));

      if (!name || !category || !(price >= 0)) {
        return res
          .status(400)
          .json({ error: "Missing required fields (name/title, price, category)" });
      }

      const now = new Date();
      const doc: any = {
        department,
        name,
        title: name,
        description,
        price,
        unitPrice: price,
        salePrice: salePrice ? Number(salePrice) : undefined,
        category,
        subCategory: subCategory || undefined,
        featured,
        gender: (toStr(fields.gender) as "unisex" | "him" | "her") || "unisex",
        audience: audience.length ? audience : ["unisex"],
        specs,
        images,
        imageUrl: images[0] || undefined, // keep legacy readers happy
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection("products").insertOne(doc);
      const created = await db.collection("products").findOne({ _id: result.insertedId });
      return res.status(201).json({ product: normalizeDoc(created) });
    } catch (e: any) {
      console.error("POST create product error", e);
      return res.status(400).json({ error: e?.message || "Create failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
