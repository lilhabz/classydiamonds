import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = await clientPromise;
  const db = client.db();
  const photos = await db
    .collection("customPhotos")
    .find()
    .sort({ createdAt: -1 })
    .toArray();
  return res.status(200).json({ photos });
}
