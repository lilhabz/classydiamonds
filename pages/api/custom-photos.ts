// 📂 /pages/api/custom-photos.ts — Public GET (typed + minimal fields)
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

type ApiPhoto = { _id: string; imageUrl: string; createdAt: string };

export const runtime = "nodejs";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ photos?: ApiPhoto[]; error?: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const raw = await db
      .collection("customPhotos")
      .find({}, { projection: { imageUrl: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    const photos: ApiPhoto[] = raw.map((doc: any) => ({
      _id: doc._id.toString(),
      imageUrl: doc.imageUrl,
      createdAt: new Date(doc.createdAt).toISOString(),
    }));

    return res.status(200).json({ photos });
  } catch (err: any) {
    console.error("GET /api/custom-photos error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
