// pages/api/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { listProducts } from "@/lib/products";

type Audience = "him" | "her";

function normalizeAudienceParam(
  aud?: string,
  gen?: string
): Audience[] | undefined {
  const vals = [
    ...(aud ? aud.split(",") : []),
    ...(gen ? gen.split(",") : []), // legacy gender support
  ]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!vals.length) return undefined;

  const mapped = vals
    .map((v) => (v === "male" ? "him" : v === "female" ? "her" : v))
    .filter((v): v is Audience => v === "him" || v === "her");

  return Array.from(new Set(mapped));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { q, category, subCategory, subcategory, audience, gender, limit } =
    req.query as Record<string, string | undefined>;

  const filter: any = {};

  if (category) filter.category = category;
  // accept both spellings
  const sub = subcategory ?? subCategory;
  if (typeof sub === "string" && sub) {
    filter.$or = [
      ...(filter.$or ?? []),
      { subcategory: sub },
      { subCategory: sub },
    ];
  }

  if (q && q.trim() !== "") {
    filter.$or = [
      ...(filter.$or ?? []),
      { name: { $regex: q, $options: "i" } },
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { slug: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }

  // Audience (with legacy gender fallback). We match docs whose `audience` intersects
  // selected values OR whose legacy `gender` matches the mapped values.
  const wanted = normalizeAudienceParam(audience, gender);
  if (wanted?.length) {
    const legacyMap = wanted.map((a) => (a === "him" ? "male" : "female"));
    filter.$or = [
      ...(filter.$or ?? []),
      {
        $expr: {
          $gt: [
            {
              $size: {
                $setIntersection: [{ $ifNull: ["$audience", []] }, wanted],
              },
            },
            0,
          ],
        },
      },
      { gender: { $in: legacyMap } },
    ];
  }

  const lim = Math.min(100, Math.max(1, parseInt(limit ?? "50", 10)));
  const products = await listProducts(filter, {
    sort: { createdAt: -1 },
    limit: lim,
  });
  res.status(200).json({ products });
}
