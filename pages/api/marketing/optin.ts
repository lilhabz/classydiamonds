// 📧 pages/api/marketing/optin.ts — Simple marketing email opt-in (idempotent upsert)

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

type Ok = { ok: true } | { ok: false; error: string };

function isValidEmail(email = ""): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeStr(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { email, name, source, tags } = (req.body ?? {}) as {
      email?: string;
      name?: string;
      source?: string;
      tags?: string[]; // optional categorization
    };

    const cleanEmail = safeStr(email).toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res
        .status(400)
        .json({ ok: false, error: "A valid email is required." });
    }

    const cleanName = safeStr(name);
    const cleanSource = safeStr(source) || "manual"; // default source label
    const cleanTags = Array.isArray(tags)
      ? tags
          .filter((t) => typeof t === "string" && t.trim())
          .map((t) => t.trim())
      : [];

    const client = await clientPromise;
    const db = client.db();
    const list = db.collection("marketing_list");

    // Optional: ensure index on email (ignore errors if it already exists)
    try {
      await list.createIndex({ email: 1 }, { unique: true });
    } catch {
      // no-op
    }

    await list.updateOne(
      { email: cleanEmail },
      {
        $set: {
          email: cleanEmail,
          name: cleanName || undefined,
          source: cleanSource,
          tags: cleanTags.length ? cleanTags : undefined,
          lastOptInAt: new Date(),
          unsubscribed: false, // explicit opt-in resets this
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[/api/marketing/optin] error:", err?.message || err);
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
}
