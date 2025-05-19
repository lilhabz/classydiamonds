// 📄 pages/api/account/update-profile.ts – Update User Profile Info ✏️

import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getSession({ req });
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const result = await db
      .collection("users")
      .updateOne({ email: session.user.email }, { $set: { name, email } });

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "No changes made." });
    }

    res.status(200).json({ message: "Profile updated." });
  } catch (err) {
    console.error("Profile update failed:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}
