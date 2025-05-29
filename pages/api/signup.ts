// 📄 pages/api/signup.ts – Signup Endpoint with Name Parsing 💾

import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 🚫 Only allow POST
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  // 📥 Extract fullName, email, password
  const { name: fullName, email, password } = req.body;

  // ⚠️ Validate required fields
  if (!fullName || !email || !password)
    return res.status(400).json({ error: "Missing required fields" });

  // 🔄 Split fullName into firstName + lastName
  const [firstName, ...rest] = fullName.trim().split(" ");
  const lastName = rest.join(" ") || "";

  try {
    // 🔗 Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("classydiamonds");
    const users = db.collection("users");

    // 🔎 Check existing email
    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // 🔒 Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 🆕 Insert user with parsed names
    const result = await users.insertOne({
      firstName, // 😊 Parsed first name
      lastName, // 😊 Parsed last name
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    // ✅ Success response
    return res
      .status(201)
      .json({ message: "User created", userId: result.insertedId });
  } catch (err) {
    console.error("❌ Signup error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
