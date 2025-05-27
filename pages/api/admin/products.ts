// 📄 pages/api/admin/products.ts – robust POST handler with JSON fallback 🚀

import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";
import formidable, { File as FormidableFile } from "formidable";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

// Disable default body parser
export const config = { api: { bodyParser: false } };

type Data = { success?: boolean; product?: any; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // 1) Preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", ["POST", "OPTIONS"]);
      return res.status(200).json({}); // empty JSON
    }

    // 2) Only POST
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST", "OPTIONS"]);
      return res
        .status(405)
        .json({ message: `Method ${req.method} Not Allowed` });
    }

    // 3) Validate content-type
    const contentType = req.headers["content-type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return res.status(400).json({ message: "Expected multipart/form-data" });
    }

    // 4) Parse form-data
    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) =>
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      )
    );

    // 5) Extract
    const name = Array.isArray(fields.name)
      ? fields.name[0]
      : fields.name || "";
    const description = Array.isArray(fields.description)
      ? fields.description[0]
      : fields.description || "";
    const price = parseFloat(
      Array.isArray(fields.price) ? fields.price[0] : fields.price || "0"
    );
    const category = Array.isArray(fields.category)
      ? fields.category[0]
      : fields.category || "";

    // 6) Validate image
    const rawFile = files.image;
    let imageFile: FormidableFile;
    if (Array.isArray(rawFile)) imageFile = rawFile[0];
    else if (rawFile) imageFile = rawFile;
    else return res.status(400).json({ message: "Image file missing" });

    // 7) Upload to Cloudinary
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

    // 8) Slug and insert
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

    // 9) Success
    return res.status(201).json({ success: true, product });
  } catch (err: any) {
    console.error("API Error:", err);
    // Always return JSON for errors
    return res
      .status(500)
      .json({ message: err.message || "Internal Server Error" });
  }
}
