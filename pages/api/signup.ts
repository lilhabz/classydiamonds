// 📄 pages/api/signup.ts

import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const client = await clientPromise;
    const db = client.db("classydiamonds");
    const users = db.collection("users");

    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await users.insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return res
      .status(201)
      .json({ message: "User created", userId: result.insertedId });
  } catch (err) {
    console.error("❌ Signup error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
