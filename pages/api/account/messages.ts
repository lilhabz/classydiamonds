// 📄 pages/api/account/messages.ts – Fetch Contact + Custom Form Messages for Account Page 💎

import { getSession } from "next-auth/react";
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const messages = await db
      .collection("messages")
      .find({ email: session.user?.email })
      .sort({ submittedAt: -1 })
      .toArray();

    res.status(200).json(messages);
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
}
