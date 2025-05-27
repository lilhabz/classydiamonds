// 📄 pages/api/admin/products.ts – POST with Cloudinary upload + CORS preflight support 🛠️

import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import clientPromise from "@/lib/mongodb";
import formidable, { File as FormidableFile } from "formidable";

// 🔌 Configure Cloudinary credentials via .env.local
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

// 🚫 Disable default body parser to handle multipart form-data
export const config = {
  api: { bodyParser: false },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 🚧 Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res
      .status(405)
      .json({ message: `Method ${req.method} not allowed` });
  }

  // Parse form-data via formidable
  const form = new formidable.IncomingForm();
  try {
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Extract and validate fields
    const rawName = fields.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName || "";
    const rawDescription = fields.description;
    const description = Array.isArray(rawDescription)
      ? rawDescription[0]
      : rawDescription || "";
    const rawPrice = fields.price;
    const price = parseFloat(
      Array.isArray(rawPrice) ? rawPrice[0] : rawPrice || "0"
    );
    const rawCategory = fields.category;
    const category = Array.isArray(rawCategory)
      ? rawCategory[0]
      : rawCategory || "";

    // Validate image upload
    const rawFile = files.image;
    let imageFile: FormidableFile;
    if (Array.isArray(rawFile)) {
      imageFile = rawFile[0];
    } else if (rawFile) {
      imageFile = rawFile;
    } else {
      return res.status(400).json({ message: "Image file missing" });
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
      resource_type: "image",
    });

    const imageUrl =
      uploadResult.eager && uploadResult.eager[0]?.secure_url
        ? uploadResult.eager[0].secure_url
        : uploadResult.secure_url;

    // Generate slug
    const slug = slugify(name, { lower: true });

    // Insert into MongoDB
    const client = await clientPromise;
    const db = client.db();
    const productData = {
      name,
      description,
      price,
      category,
      slug,
      imageUrl,
      createdAt: new Date(),
    };
    await db.collection("products").insertOne(productData);

    return res.status(201).json({ success: true, product: productData });
  } catch (err: any) {
    console.error(err);
    return res
      .status(500)
      .json({ message: err.message || "Upload or DB error" });
  }
}
