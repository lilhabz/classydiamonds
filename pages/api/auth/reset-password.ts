// pages/api/auth/reset-password.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { token, newPassword } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ ok: false, error: "Missing token" });
  }
  if (
    !newPassword ||
    typeof newPassword !== "string" ||
    newPassword.length < 8
  ) {
    return res
      .status(400)
      .json({ ok: false, error: "Password must be at least 8 characters" });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const client = await clientPromise;
    const db = client.db("classydiamonds");
    const users = db.collection("users");

    const user = await users.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ ok: false, error: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await users.updateOne(
      { _id: user._id },
      {
        $set: { password: hashed },
        $unset: { resetTokenHash: "", resetTokenExpires: "" },
      }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("reset-password error:", err);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
}
