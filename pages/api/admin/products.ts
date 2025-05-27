// 📄 pages/api/admin/products.ts – Fixed duplicate config export & robust handler 🛠️

import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";
import * as formidable from "formidable";

// Disable Next.js built-in body-parser to handle multipart
// 🛑 Ensure Cloudinary env vars are present
if (
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET ||
  !process.env.CLOUDINARY_CLOUD_NAME
) {
  console.error("Missing Cloudinary environment variables:", {
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET,
    name: process.env.CLOUDINARY_CLOUD_NAME,
  });
  throw new Error("Cloudinary environment variables must be set");
}

export const config = { api: { bodyParser: false } };

type Data = { success?: boolean; product?: any; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", ["POST", "OPTIONS"]);
      return res.status(200).json({});
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST", "OPTIONS"]);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
    }

    const ct = req.headers["content-type"] || "";
    if (!ct.includes("multipart/form-data")) {
      return res.status(400).json({ message: "Expected multipart/form-data" });
    }

    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(req, (err, flds, fls) => {
        if (err) reject(err);
        else resolve({ fields: flds, files: fls });
      });
    });

    const name = Array.isArray(fields.name)
      ? fields.name[0]
      : typeof fields.name === "string"
      ? fields.name
      : "";
    const description = Array.isArray(fields.description)
      ? fields.description[0]
      : typeof fields.description === "string"
      ? fields.description
      : "";
    const priceStr = Array.isArray(fields.price)
      ? fields.price[0]
      : typeof fields.price === "string"
      ? fields.price
      : "0";
    const price = parseFloat(priceStr);
    const category = Array.isArray(fields.category)
      ? fields.category[0]
      : typeof fields.category === "string"
      ? fields.category
      : "";

    const rawFile = files.image;
    let imageFile: formidable.File;
    if (Array.isArray(rawFile)) imageFile = rawFile[0];
    else if (rawFile) imageFile = rawFile;
    else return res.status(400).json({ message: "Image file missing" });

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
      resource_type: "image",
    });
    const imageUrl =
      uploadResult.eager?.[0]?.secure_url || uploadResult.secure_url;

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
  } catch (err: any) {
    console.error("API Error:", err);
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
}
