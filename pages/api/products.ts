// 📄 pages/api/products.ts – GET all products & POST new product 🛠️

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db();

  // ➕ Create a new product
  if (req.method === "POST") {
    try {
      const newProduct = req.body;
      // 🛡️ Basic validation (adjust fields as needed)
      if (
        !newProduct.name ||
        !newProduct.price ||
        !newProduct.image ||
        !newProduct.category ||
        !newProduct.slug
      ) {
        return res
          .status(400)
          .json({ message: "Missing required product fields" });
      }

      const result = await db.collection("products").insertOne(newProduct);
      const created = await db
        .collection("products")
        .findOne({ _id: result.insertedId });

      return res.status(201).json(created);
    } catch (err) {
      console.error("Error creating product:", err);
      return res.status(500).json({ message: "Error creating new product" });
    }
  }

  // 🔍 Fetch all products
  if (req.method === "GET") {
    try {
      const { category } = req.query;
      const filter = category ? { category } : {};
      const products = await db.collection("products").find(filter).toArray();
      return res.status(200).json(products);
    } catch (err) {
      console.error("Error fetching products:", err);
      return res.status(500).json({ message: "Error fetching products" });
    }
  }

  // 🚫 Other methods not allowed
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
