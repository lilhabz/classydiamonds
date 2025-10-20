// pages/api/account/favorites.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

/** Normalize & dedupe an arbitrary input into an array of clean string IDs */
function sanitizeIds(input: unknown, max = 1000): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const v of input) {
    if (typeof v === "string") {
      const s = v.trim();
      if (s) out.push(s);
    }
  }
  // Keep order stable while removing duplicates
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of out) {
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(id);
    }
    if (deduped.length >= max) break;
  }
  return deduped;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Require auth for all methods (guests are handled via localStorage in the client)
  const session = await getServerSession(req, res, authOptions as any);
  const userId = (session as any)?.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const client = await clientPromise;
  const db = client.db();
  const users = db.collection("users");

  // Ensure the user doc exists (NextAuth + MongoDBAdapter should handle this)
  const userDoc = await users.findOne({ _id: userId } as any);

  if (!userDoc) {
    // Very rare, but if no doc is found, create a minimal one with this _id.
    await users.updateOne(
      { _id: userId } as any,
      { $setOnInsert: { favorites: [] } },
      { upsert: true }
    );
  }

  switch (req.method) {
    case "GET": {
      const doc = await users.findOne({ _id: userId } as any, {
        projection: { favorites: 1 },
      });
      const favorites = Array.isArray(doc?.favorites)
        ? sanitizeIds(doc?.favorites)
        : [];
      return res.status(200).json({ favorites });
    }

    case "PUT": {
      // Replace the server favorites with the provided list
      const favorites = sanitizeIds(req.body?.favorites);
      await users.updateOne(
        { _id: userId } as any,
        { $set: { favorites } },
        { upsert: true }
      );
      return res.status(200).json({ favorites });
    }

    case "PATCH": {
      // Merge provided list into existing server list
      const incoming = sanitizeIds(req.body?.favorites);
      const doc = await users.findOne({ _id: userId } as any, {
        projection: { favorites: 1 },
      });
      const existing = Array.isArray(doc?.favorites)
        ? sanitizeIds(doc?.favorites)
        : [];
      const merged = sanitizeIds([...existing, ...incoming]);
      await users.updateOne(
        { _id: userId } as any,
        { $set: { favorites: merged } },
        { upsert: true }
      );
      return res.status(200).json({ favorites: merged });
    }

    default: {
      res.setHeader("Allow", "GET,PUT,PATCH");
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  }
}
