// 📄 pages/api/account/update-profile.ts – Update Full User Profile with Structured Address ✏️

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 Use JWT-safe token for authentication
  const token = await getToken({ req });
  if (!token?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 🧾 Pull structured data from body
  const { name, email, phone, address } = req.body;

  // ✅ Validate name + email
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  // ✅ Validate address structure (safe default)
  const safeAddress = {
    street1: address?.street1 || "",
    street2: address?.street2 || "",
    city: address?.city || "",
    state: address?.state || "",
    zip: address?.zip || "",
    country: address?.country || "",
  };

  try {
    const client = await clientPromise;
    const db = client.db();

    // 🛠️ Update user record
    const result = await db.collection("users").updateOne(
      { email: token.email },
      {
        $set: {
          name,
          email,
          phone: phone || "",
          address: safeAddress,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "No changes made." });
    }

    res.status(200).json({ message: "✅ Profile updated successfully." });
  } catch (err) {
    console.error("❌ Profile update failed:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}
