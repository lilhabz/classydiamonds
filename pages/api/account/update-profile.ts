// 📄 pages/api/account/update-profile.ts – Update Full User Profile Info ✏️ (JWT-safe)

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 Use JWT-safe token instead of getSession()
  const token = await getToken({ req });
  if (!token?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 🧾 Pull data from the POST body
  const { name, email, phone, address, city, state, zip, country } = req.body;

  // ✅ Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // 🛠️ Update user profile using email from JWT token
    const result = await db.collection("users").updateOne(
      { email: token.email },
      {
        $set: {
          name,
          email,
          phone,
          address,
          city,
          state,
          zip,
          country,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "No changes made." });
    }

    res.status(200).json({ message: "Profile updated." });
  } catch (err) {
    console.error("Profile update failed:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}
