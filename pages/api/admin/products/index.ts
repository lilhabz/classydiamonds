// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { getDb } from "@/lib/products";

// Try to import storefront helpers (optional, runtime-safe)
let storefrontNormalizeProduct: ((doc: any) => any) | null = null;
let storefrontListProducts: ((opts?: any) => Promise<any[]>) | null = null;
try {
  // These may or may not exist; we guard their usage below.
  // If your lib exports different names, you can alias here.
  const lib = require("@/lib/products");
  storefrontNormalizeProduct = lib.normalizeProduct || null;
  storefrontListProducts = lib.listProducts || null;
} catch {
  // ignore
}

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

function parseForm(
  req: NextApiRequest
): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

/** ---------------- Fallback normalizer (matches your storefront assumptions) ---------------- */
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

/** Build a Mongo filter that’s tolerant of legacy fields */
function buildFilterFromQuery(query: NextApiRequest["query"]) {
  const { department, category, subCategory, q, audience, specs } = query;
  const filter: any = {};

  // Department can live in different fields historically
  if (typeof department === "string" && department) {
    filter.$or = [
      ...(filter.$or || []),
      { department },
      { category: department }, // some legacy put it in 'category'
    ];
  }

  if (typeof category === "string" && category) {
    filter.category = category;
  }

  if (typeof subCategory === "string" && subCategory) {
    filter.$or = [
      ...(filter.$or || []),
      { subCategory },
      { subcategory: subCategory }, // legacy spelling
    ];
  }

  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      ...(filter.$or || []),
      { name: { $regex: q, $options: "i" } },
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
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
      // ignore invalid JSON
    }
  }

  return filter;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // ----------------- GET: Prefer storefront listProducts(), else manual query + normalize -----------------
  if (req.method === "GET") {
    try {
      // If the storefront's listProducts exists, use it so we perfectly match storefront behavior.
      if (storefrontListProducts) {
        // Map admin query params to something listProducts can use.
        // If your listProducts accepts a different shape, update this args object accordingly.
        const args: any = {
          limit: 500,
          sort: { createdAt: -1 },
          // Pass original query for internal handling (filters/search)
          query: req.query,
          includeDrafts: true, // if your lib supports it; harmless if ignored
        };

        const list = await storefrontListProducts(args);
        // Some listProducts already returns normalized. If not, we normalize here.
        const products = Array.isArray(list)
          ? list.map((p) => normalizeProduct(p))
          : [];

        return res.status(200).json({ products });
      }

      // Fallback: manual query + same normalization as storefront
      const db = await getDb();
      const filter = buildFilterFromQuery(req.query);
      const raw = await db
        .collection("products")
        .find(Object.keys(filter).length ? filter : {})
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      const products = raw.map(normalizeProduct);
      return res.status(200).json({ products });
    } catch (e: any) {
      console.error("GET products error", e);
      return res.status(500).json({ error: "Failed to load products" });
    }
  }

  // ----------------- POST: create (multipart + Cloudinary) -----------------
  if (req.method === "POST") {
    try {
      const db = await getDb();
      const { fields, files } = await parseForm(req);

      const name = String(fields.name || "").trim();
      const description = String(fields.description || "");
      const price = String(fields.price || "");
      const salePrice = String(fields.salePrice || "");
      const category = String(fields.category || "");
      const subcategoryIn = String(fields.subcategory || ""); // incoming form key
      const subCategory = subcategoryIn || "";
      const featured = String(fields.featured || "") === "true";
      const gender = String(fields.gender || "unisex") as
        | "unisex"
        | "him"
        | "her";

      if (!name || !price || !category)
        return res
          .status(400)
          .json({ error: "Missing required fields (name, price, category)" });

      const department =
        category === "watches" || category === "watch" ? "watch" : "jewelry";

      let imageUrl: string | undefined;
      const imageFile = files.image as FormidableFile | undefined;
      if (imageFile?.filepath) {
        const upload = await cloudinary.uploader.upload(imageFile.filepath, {
          folder: "classy-diamonds/products",
          resource_type: "image",
        });
        imageUrl = upload.secure_url;
      }

      const now = new Date();
      const doc: any = {
        department,
        name,
        title: name, // keep legacy compatibility
        description,
        price: Number(price),
        salePrice: salePrice ? Number(salePrice) : undefined,
        category,
        subCategory: subCategory || undefined, // store with capital C (your current pattern)
        featured,
        gender,
        imageUrl,
        images: imageUrl ? [imageUrl] : [], // mirror for legacy array readers
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection("products").insertOne(doc);
      const created = await db
        .collection("products")
        .findOne({ _id: result.insertedId });
      return res.status(201).json({ product: normalizeProduct(created) });
    } catch (e: any) {
      console.error("POST create product error", e);
      return res.status(400).json({ error: e?.message || "Create failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
