// 📄 pages/api/admin/products.ts – Admin product list & creation handler with featured support 🛠️

import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";
import formidable from "formidable";

// Disable Next.js built-in body parser to handle multipart/form-data
export const config = { api: { bodyParser: false } };

type Product = {
  _id: any;
  name: string;
  description: string;
  price: number;
  category: string;
  slug: string;
  imageUrl: string;
  featured: boolean;
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
  // Initialize Cloudinary
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

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    return res.status(200).end();
  }

  // Handle GET: list all products
  if (req.method === "GET") {
    const client = await clientPromise;
    const raw = await client.db().collection("products").find().toArray();
    // 🔄 Map raw documents to our Product type
    const products: Product[] = raw.map((doc: any) => ({
      _id: doc._id,
      name: doc.name,
      description: doc.description,
      price: doc.price,
      category: doc.category,
      slug: doc.slug,
      imageUrl: doc.imageUrl,
      featured: !!doc.featured,
      createdAt: doc.createdAt,
    }));
    return res.status(200).json({ success: true, products });
  }

  // Only allow POST beyond this point
  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    return res
      .status(405)
      .json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    // Parse multipart/form-data
    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise<any>((resolve, reject) => {
      form.parse(req, (err, flds, fls) =>
        err ? reject(err) : resolve({ fields: flds, files: fls })
      );
    });

    // Helper to extract a string
    const getString = (val: any, fallback = ""): string => {
      if (Array.isArray(val)) return val[0] ?? fallback;
      if (typeof val === "string") return val;
      return fallback;
    };

    // Extract fields
    const name = getString(fields.name);
    const description = getString(fields.description);
    const price = parseFloat(getString(fields.price, "0"));
    const category = getString(fields.category);
    const featured = getString(fields.featured, "false") === "true";

    // Handle image file
    const rawFile = files.image;
    const imageFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;
    if (!imageFile || typeof imageFile === "string") {
      return res
        .status(400)
        .json({ success: false, message: "Image file missing" });
    }

    // Upload to Cloudinary
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
    const imageUrl =
      uploadResult.eager?.[0]?.secure_url || uploadResult.secure_url;

    // Build product object
    const slug = slugify(name, { lower: true });
    const newProduct: Omit<Product, "_id"> = {
      name,
      description,
      price,
      category,
      slug,
      imageUrl,
      featured,
      createdAt: new Date(),
    };

    // Insert into MongoDB
    const client = await clientPromise;
    const result = await client
      .db()
      .collection("products")
      .insertOne(newProduct);
    const product = { _id: result.insertedId, ...newProduct };

    return res.status(201).json({ success: true, product });
  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}
