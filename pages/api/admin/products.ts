// 📄 pages/api/admin/products.ts – Admin product list & creation handler (Cloudinary upload + SUBCATEGORY support)

import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";
import { IncomingForm, Files, Fields, File } from "formidable";

export const config = { api: { bodyParser: false } };

type Product = {
  _id: any;
  skuNumber: number;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  category: string;
  subcategory?: string; // ✅ added
  slug: string;
  imageUrl: string; // empty string if no image
  featured: boolean;
  gender?: "unisex" | "him" | "her";
  tags: string[];
  createdAt: Date;
};

type Data =
  | { success: true; products: Product[] }
  | { success: true; product: Product }
  | { success?: false; message: string };

function getString(val: any, fallback = ""): string {
  if (Array.isArray(val)) return (val[0] ?? fallback) as string;
  if (typeof val === "string") return val;
  return fallback;
}

// conservative slug normalizer (keeps what Admin sends but safe)
function toSlug(s: string) {
  // use slugify for strong normalization
  return slugify(s, { lower: true, strict: true });
}

async function parseForm(
  req: NextApiRequest
): Promise<{ fields: Fields; files: Files }> {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 20 * 1024 * 1024, // 20MB
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Basic method allowlist / preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    return res.status(200).end();
  }
  if (!["GET", "POST"].includes(req.method || "")) {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    return res
      .status(405)
      .json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  // Cloudinary config (needed only for POST with image, but safe to init once)
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error("Cloudinary config missing");
    if (req.method === "POST") {
      return res
        .status(500)
        .json({ success: false, message: "Cloudinary configuration error" });
    }
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection("products");

  // =========================
  // GET: list all products
  // =========================
  if (req.method === "GET") {
    const raw = await collection.find().sort({ skuNumber: 1 }).toArray();

    const products: Product[] = raw.map((doc: any) => ({
      _id: doc._id,
      skuNumber: doc.skuNumber ?? 0,
      name: doc.name,
      description: doc.description,
      price: doc.price,
      salePrice: doc.salePrice,
      category: doc.category,
      subcategory: doc.subcategory || "", // ✅ ensure string
      slug: doc.slug,
      imageUrl: doc.imageUrl || "", // ensure string
      featured: !!doc.featured,
      gender: (doc.gender as Product["gender"]) || "unisex",
      tags: (doc.tags as string[]) || [],
      createdAt: doc.createdAt,
    }));

    return res.status(200).json({ success: true, products });
  }

  // =========================
  // POST: create product
  // =========================
  try {
    const { fields, files } = await parseForm(req);

    const name = getString(fields.name).trim();
    const description = getString(fields.description).trim();
    const priceStr = getString(fields.price, "0").trim();
    const salePriceStr = getString(fields.salePrice).trim();
    const category = getString(fields.category).trim();
    const featured = getString(fields.featured, "false") === "true";

    // ✅ subcategory (optional) – keep slug coming from Admin; normalize safely
    const rawSub = getString(fields.subcategory).trim();
    const subcategory = rawSub ? toSlug(rawSub) : "";

    if (!name || !description || !category) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const price = parseFloat(priceStr);
    if (Number.isNaN(price)) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    const salePrice =
      salePriceStr && !Number.isNaN(parseFloat(salePriceStr))
        ? parseFloat(salePriceStr)
        : undefined;

    const genderStr = getString(fields.gender, "unisex");
    const gender: "unisex" | "him" | "her" =
      genderStr === "him" || genderStr === "her" ? genderStr : "unisex";

    const tagsRaw = fields.tags;
    const tags: string[] = Array.isArray(tagsRaw)
      ? (tagsRaw as string[]).filter(Boolean)
      : tagsRaw
      ? [getString(tagsRaw)]
      : [];

    // 🖼️ Handle image upload if provided; otherwise keep imageUrl as empty string
    let imageUrl = "";
    const rawFile = (files as any).image as File | File[] | undefined;
    const imageFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;

    if (imageFile && (imageFile as any).filepath) {
      try {
        const uploadResult = await cloudinary.uploader.upload(
          (imageFile as any).filepath,
          {
            folder: "classy-diamonds/original",
            transformation: [
              { crop: "fill", width: 1200, height: 1200 },
              { fetch_format: "auto" },
              { quality: "auto" },
            ],
            resource_type: "image",
            overwrite: false,
          }
        );
        imageUrl = uploadResult.secure_url;
      } catch (err) {
        console.error("Cloudinary upload failed:", err);
        return res
          .status(500)
          .json({
            success: false,
            message: "Image upload failed. Please try again.",
          });
      }
    }

    // 🔢 Determine next SKU
    const top = await collection
      .find()
      .sort({ skuNumber: -1 })
      .limit(1)
      .toArray();
    const maxSku = top[0]?.skuNumber ?? 0;
    const skuNumber = maxSku + 1;

    // 🔗 Slug (basic). If you want uniqueness, append -2, -3... when duplicates exist.
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    const existingSameSlug = await collection.findOne({ slug });
    if (existingSameSlug) {
      // simple disambiguation: append sku
      slug = `${baseSlug}-${skuNumber}`;
    }

    const newProduct: Omit<Product, "_id"> = {
      skuNumber,
      name,
      description,
      price,
      ...(salePrice !== undefined && { salePrice }),
      category,
      subcategory, // ✅ save it
      slug,
      imageUrl, // "" if none
      featured,
      gender,
      tags,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newProduct as any);
    const product: Product = { _id: result.insertedId, ...newProduct };

    return res.status(201).json({ success: true, product });
  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error",
    });
  }
}
