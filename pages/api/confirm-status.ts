// 📄 pages/api/confirm-status.ts – Check if a user’s email has been confirmed
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ confirmed: boolean }>
) {
  const email = req.query.email;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ confirmed: false });
  }

  const client = await clientPromise;
  const db = client.db("classydiamonds");
  const user = await db.collection("users").findOne({ email });

  res.status(200).json({ confirmed: !!user?.emailConfirmed });
}
