// 📄 pages/api/admin/products.ts

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

/**
 * @route POST /api/admin/products
 * Handles image upload + auto-compression with Cloudinary,
 * slug generation, & insertion into MongoDB.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse the form data
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Form parse error" });
    }

    try {
      // 🛠️ Safely narrow multipart fields
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

      // 🛠️ Safely narrow file upload
      const rawFile = files.image;
      let imageFile: FormidableFile;
      if (Array.isArray(rawFile)) {
        imageFile = rawFile[0];
      } else if (rawFile) {
        imageFile = rawFile;
      } else {
        throw new Error("Image file missing");
      }

      // Upload original + eager-compress via Cloudinary
      const uploadResult = await cloudinary.uploader.upload(
        imageFile.filepath,
        {
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
        }
      );

      // Use compressed URL if available
      const imageUrl =
        uploadResult.eager && uploadResult.eager[0]?.secure_url
          ? uploadResult.eager[0].secure_url
          : uploadResult.secure_url;

      // Auto-generate slug from name
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
    } catch (uploadErr) {
      console.error(uploadErr);
      return res.status(500).json({ message: "Upload or DB error" });
    }
  });
}
