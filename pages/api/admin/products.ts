// 📄 pages/api/admin/products.ts – Admin product list & creation handler with featured + skuNumber support 🛠️

import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";
import { IncomingForm } from "formidable";

// Disable Next.js built-in body parser to handle multipart/form-data
export const config = { api: { bodyParser: false } };

type Product = {
  _id: any;
  skuNumber: number;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  category: string;
  slug: string;
  imageUrl: string;
  featured: boolean;
  gender?: "unisex" | "him" | "her";
  tags: string[];
  createdAt: Date;
};

type Data =
  | { success: true; products: Product[] }
  | { success: true; product: Product }
  | { success?: false; message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // 📦 Cloudinary config
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error("Cloudinary config missing");
    return res
      .status(500)
      .json({ success: false, message: "Cloudinary configuration error" });
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // 🔄 CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    return res.status(200).end();
  }

  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<Product>("products");

  // 📝 GET: list all products, sorted by skuNumber
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
      slug: doc.slug,
      imageUrl: doc.imageUrl,
      featured: !!doc.featured,
      gender: doc.gender || "unisex",
      tags: doc.tags || [],
      createdAt: doc.createdAt,
    }));
    return res.status(200).json({ success: true, products });
  }

  // ✋ Only allow POST beyond this point
  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    return res
      .status(405)
      .json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    // 🛠️ Parse multipart/form-data
    const form = new IncomingForm();
    const { fields, files } = await new Promise<any>((resolve, reject) => {
      form.parse(req, (err, flds, fls) =>
        err ? reject(err) : resolve({ fields: flds, files: fls })
      );
    });

    // 🔍 Helper to extract a string
    const getString = (val: any, fallback = ""): string =>
      Array.isArray(val)
        ? val[0] ?? fallback
        : typeof val === "string"
        ? val
        : fallback;

    // 📋 Extract fields
    const name = getString(fields.name);
    const description = getString(fields.description);
    const price = parseFloat(getString(fields.price, "0"));
    const salePriceStr = getString(fields.salePrice);
    const salePrice = salePriceStr ? parseFloat(salePriceStr) : undefined;
    const category = getString(fields.category);
    const featured = getString(fields.featured, "false") === "true";

    const genderStr = getString(fields.gender, "unisex");
    const gender: "unisex" | "him" | "her" = ["unisex", "him", "her"].includes(genderStr)
      ? (genderStr as "unisex" | "him" | "her")
      : "unisex";

    const tagsRaw = fields.tags;
    const tags = Array.isArray(tagsRaw)
      ? tagsRaw.filter(Boolean)
      : tagsRaw
      ? [getString(tagsRaw)]
      : [];

    // 📁 Handle image file
    const rawFile = files.image;
    const imageFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;
    let imageUrl = "/products/placeholder.jpg";

    if (imageFile && typeof imageFile !== "string") {
      // ☁️ Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(imageFile.filepath, {
        folder: "classy-diamonds/original",
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
        eager: [
          {
            folder: "classy-diamonds/compressed",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      });
      imageUrl =
        uploadResult.eager?.[0]?.secure_url || uploadResult.secure_url;
    }

    // 🔢 Determine next skuNumber
    const top = await collection
      .find()
      .sort({ skuNumber: -1 })
      .limit(1)
      .toArray();
    const maxSku = top[0]?.skuNumber ?? 0;
    const skuNumber = maxSku + 1;

    // 📦 Build new product object
    const slug = slugify(name, { lower: true });
    const newProduct: Omit<Product, "_id"> = {
      skuNumber,
      name,
      description,
      price,
      ...(salePrice !== undefined && { salePrice }),
      category,
      slug,
      imageUrl,
      featured,
      gender,
      tags,
      createdAt: new Date(),
    };

    // 💾 Insert into MongoDB (cast to any to avoid missing _id error)
    const result = await collection.insertOne(newProduct as any);
    const product: Product = { _id: result.insertedId, ...newProduct };
    return res.status(201).json({ success: true, product });
  } catch (error: any) {
    console.error("API Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal Server Error",
      });
  }
}
