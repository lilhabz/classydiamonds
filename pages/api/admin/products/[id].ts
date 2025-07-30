// 📄 pages/api/admin/products/[id].ts – Update & Delete a single product 🛠️ (With Cloudinary Upload on Edit)

import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { IncomingForm } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import clientPromise from "@/lib/mongodb";

// Disable Next.js default body parsing for file uploads
export const config = { api: { bodyParser: false } };

// Define Product type
type Product = {
  _id: ObjectId;
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
  | { success: true; product?: Product }
  | { success: false; message: string };

// Placeholder for missing images
const PLACEHOLDER =
  "https://res.cloudinary.com/demo/image/upload/c_fill,ar_1:1,w_1200,h_1200/v1234567890/gray-placeholder.jpg";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<Product>("products");
  const filter = { _id: new ObjectId(id) };

  switch (req.method) {
    case "PUT":
      try {
        // Parse form data (fields + optional file)
        const form = new IncomingForm();
        const { fields, files } = await new Promise<any>((resolve, reject) => {
          form.parse(req, (err, flds, fls) =>
            err ? reject(err) : resolve({ fields: flds, files: fls })
          );
        });

        // Extract fields safely
        const getString = (val: any, fallback = ""): string =>
          Array.isArray(val)
            ? val[0] ?? fallback
            : typeof val === "string"
            ? val
            : fallback;

        const updates: Partial<Product> = {
          name: getString(fields.name),
          description: getString(fields.description),
          price: parseFloat(getString(fields.price, "0")),
          salePrice: fields.salePrice
            ? parseFloat(getString(fields.salePrice))
            : undefined,
          category: getString(fields.category),
          featured: getString(fields.featured, "false") === "true",
          gender:
            (getString(fields.gender) as "unisex" | "him" | "her") || "unisex",
        };

        // Handle image upload or removal
        const rawFile = files.image;
        const imageFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;

        // If "remove image" flag set
        const imageRemoved = getString(fields.imageRemoved, "false") === "true";
        if (imageRemoved) {
          updates.imageUrl = PLACEHOLDER;
        }

        // If new file uploaded
        if (imageFile && typeof imageFile !== "string" && imageFile.filepath) {
          const uploadResult = await cloudinary.uploader.upload(
            imageFile.filepath,
            {
              folder: "classy-diamonds/original",
              transformation: [
                { quality: "auto" },
                { fetch_format: "auto" },
                {
                  crop: "fill",
                  aspect_ratio: "1:1",
                  width: 1200,
                  height: 1200,
                },
              ],
            }
          );
          updates.imageUrl = uploadResult.secure_url;
        }

        // Save updates to DB
        await collection.updateOne(filter, { $set: updates });
        const updated = await collection.findOne(filter);
        if (!updated) throw new Error("Product not found after update");

        return res.status(200).json({ success: true, product: updated });
      } catch (err: any) {
        console.error("PUT /api/admin/products/[id] Error:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

    case "DELETE":
      try {
        await collection.deleteOne(filter);
        return res.status(200).json({ success: true });
      } catch (err: any) {
        console.error("DELETE /api/admin/products/[id] Error:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

    default:
      res.setHeader("Allow", ["PUT", "DELETE"]);
      return res
        .status(405)
        .json({ success: false, message: `Method ${req.method} Not Allowed` });
  }
}
