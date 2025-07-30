// 📄 pages/api/admin/products/[id].ts – Update & Delete a single product 🛠️ (Now with Cloudinary 1:1 Enforce)

import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

// Define Product type to mirror collection
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

// 🌫 Neutral placeholder for missing images
const PLACEHOLDER =
  "https://res.cloudinary.com/demo/image/upload/c_fill,ar_1:1,w_1200,h_1200/v1234567890/gray-placeholder.jpg";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const {
    query: { id },
    method,
    body,
  } = req;

  if (!id || typeof id !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID" });
  }

  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<Product>("products");
  const filter = { _id: new ObjectId(id) };

  switch (method) {
    case "PUT":
      try {
        const updates: Partial<Product> = body;
        delete (updates as any)._id; // ensure no _id overwrite

        // 🖼 Force 1:1 Cloudinary crop if image provided
        if (updates.imageUrl) {
          if (updates.imageUrl.includes("cloudinary.com")) {
            updates.imageUrl = updates.imageUrl.replace(
              /\/upload\/(?:[^/]+\/)*/,
              "/upload/c_fill,ar_1:1,w_1200,h_1200/"
            );
          }
        } else {
          // 🛠 Fallback to placeholder
          updates.imageUrl = PLACEHOLDER;
        }

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
        .json({ success: false, message: `Method ${method} Not Allowed` });
  }
}
