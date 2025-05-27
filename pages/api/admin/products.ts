// 📄 pages/api/admin/products.ts – Robust handler with strict TS types 🛠️

import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";
import formidable, { Fields, Files, File as FormidableFile } from "formidable";

// Disable Next.js built-in body parser for multipart
export const config = { api: { bodyParser: false } };

type Data = { success?: boolean; product?: any; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // ✔️ Handle preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", ["POST", "OPTIONS"]);
      return res.status(200).json({});
    }

    // 💥 Only accept POST
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST", "OPTIONS"]);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
    }

    // 🔍 Enforce multipart/form-data
    const ct = req.headers["content-type"] || "";
    if (!ct.includes("multipart/form-data")) {
      return res.status(400).json({ message: "Expected multipart/form-data" });
    }

    // 📦 Parse
    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise<{
      fields: Fields;
      files: Files;
    }>((resolve, reject) => {
      form.parse(req, (err, flds, fls) =>
        err ? reject(err) : resolve({ fields: flds, files: fls })
      );
    });

    // 📝 Safely extract string fields
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

    // 🖼️ File
    const rawFile = files.image;
    let imageFile: FormidableFile;
    if (Array.isArray(rawFile)) imageFile = rawFile[0] as FormidableFile;
    else if (rawFile && !Array.isArray(rawFile))
      imageFile = rawFile as FormidableFile;
    else return res.status(400).json({ message: "Image file missing" });

    // ☁️ Cloudinary upload
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

    // 🔗 Slug
    const slug = slugify(name, { lower: true });

    // 🗄️ Insert
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
