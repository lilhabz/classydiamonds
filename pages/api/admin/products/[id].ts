// 📄 pages/api/admin/products/[id].ts – Update & Delete a single product 🛠️

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
        // Expect JSON body with updates, e.g. { featured: true } or { category: "rings" }
        const updates: Partial<Product> = body;
        // Remove _id from updates if present
        delete (updates as any)._id;
        // Apply update
        await collection.updateOne(filter, { $set: updates });
        // Return updated document
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
