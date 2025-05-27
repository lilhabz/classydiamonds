// 📄 pages/api/admin/products.ts – Robust admin product creation handler 🛠️

import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";
import formidable from "formidable";

// Disable Next.js built-in body parser to handle multipart
export const config = { api: { bodyParser: false } };

type Data = { success?: boolean; product?: any; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Initialize Cloudinary with env vars
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error("Cloudinary env missing", {
      name: process.env.CLOUDINARY_CLOUD_NAME,
      key: process.env.CLOUDINARY_API_KEY,
      secret: process.env.CLOUDINARY_API_SECRET,
    });
    return res.status(500).json({ message: "Cloudinary configuration error" });
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", ["POST", "OPTIONS"]);
      return res.status(200).json({});
    }

    // Only POST
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST", "OPTIONS"]);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
    }

    // Ensure multipart
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return res.status(400).json({ message: "Expected multipart/form-data" });
    }

    // Parse form-data
    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(req, (err, flds, fls) =>
        err ? reject(err) : resolve({ fields: flds, files: fls })
      );
    });

    // Extract fields safely
    const getString = (
      value: string | string[] | undefined,
      fallback = ""
    ): string => {
      if (Array.isArray(value)) return value[0] ?? fallback;
      if (typeof value === "string") return value;
      return fallback;
    };
    const name = getString(fields.name);
    const description = getString(fields.description);
    const price = parseFloat(getString(fields.price, "0"));
    const category = getString(fields.category);

    // Extract file
    const raw = files.image;
    const imageFile = Array.isArray(raw) ? raw[0] : raw;
    if (!imageFile || typeof imageFile === "string") {
      return res.status(400).json({ message: "Image file missing" });
    }

    // Upload image
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

    // Save product
    const slug = slugify(name, { lower: true });
    const client = await clientPromise;
    const db = client.db();
    const product = {
      name,
      description,
      price,
      category,
      slug,
      imageUrl,
      createdAt: new Date(),
    };
    await db.collection("products").insertOne(product);

    return res.status(201).json({ success: true, product });
  } catch (error: any) {
    console.error("API Error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  }
}
