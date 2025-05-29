// 📄 pages/api/confirm.ts – Email Confirmation Endpoint with Redirect to Login 💌

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

    // 🔄 Verify token and mark emailConfirmed
    const result = await users.findOneAndUpdate(
      { confirmationToken: token },
      { $set: { emailConfirmed: true }, $unset: { confirmationToken: "" } },
      { returnDocument: "before" }
    );

    const user = result.value;
    if (!user) {
      return res.status(400).send("Confirmation link is invalid or expired.");
    }

    // 📫 Redirect back to login with banners and pre-filled email
    const emailParam = encodeURIComponent(user.email);
    res.writeHead(302, {
      Location: `/auth?confirmed=true&email=${emailParam}`,
    });
    return res.end();
  } catch (err) {
    console.error("❌ Confirmation error:", err);
    return res.status(500).send("Server error");
  }
}
