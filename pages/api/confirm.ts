// 📄 pages/api/confirm.ts – Email Confirmation Endpoint 💌

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function confirmHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { token } = req.query;
  if (!token || typeof token !== "string")
    return res.status(400).send("Invalid confirmation link.");

  try {
    const client = await clientPromise;
    const db = client.db("classydiamonds");
    const users = db.collection("users");

    const result = await users.findOneAndUpdate(
      { confirmationToken: token },
      { $set: { emailConfirmed: true }, $unset: { confirmationToken: "" } }
    );

    if (!result.value) {
      return res.status(400).send("Confirmation link is invalid or expired.");
    }

    // ✅ Redirect to login with flag
    res.writeHead(302, { Location: "/auth?confirmed=true" });
    return res.end();
  } catch (err) {
    console.error("❌ Confirmation error:", err);
    return res.status(500).send("Server error");
  }
}
