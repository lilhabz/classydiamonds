// 📄 pages/api/account/update-password.ts – Change User Password 🔑

import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import clientPromise from "@/lib/mongodb";
import { hash } from "bcryptjs";

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

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }

  try {
    const hashedPassword = await hash(newPassword, 10);
    const client = await clientPromise;
    const db = client.db();
    const result = await db
      .collection("users")
      .updateOne(
        { email: session.user.email },
        { $set: { password: hashedPassword } }
      );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "Password update failed." });
    }

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Password update failed:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}
