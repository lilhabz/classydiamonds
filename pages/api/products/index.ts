// pages/api/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { listProducts } from "@/lib/products";
import { categoryCandidatesFor } from "@/data/taxonomy";

type AudCore = "him" | "her";

/**
 * Normalize incoming audience-like params from multiple sources into a set of
 * core values ("him" | "her"). Accepts:
 *  - "men", "male", "him"  -> "him"
 *  - "women", "female", "her" -> "her"
 *  - "unisex" -> both "him" and "her"
 *
 * Supports comma-separated lists in either 'audience' or legacy 'gender'.
 */
function normalizeAudienceParam(
  aud?: string,
  gen?: string
): AudCore[] | undefined {
  const vals = [
    ...(aud ? aud.split(",") : []),
    ...(gen ? gen.split(",") : []), // legacy gender support
  ]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!vals.length) return undefined;

  const out = new Set<AudCore>();

  for (const v of vals) {
    if (v === "him" || v === "male" || v === "men") out.add("him");
    else if (v === "her" || v === "female" || v === "women") out.add("her");
    else if (v === "unisex") {
      // unisex means: show in both For Him and For Her (storefront intent)
      out.add("him");
      out.add("her");
    }
    // ignore anything else
  }

  return out.size ? Array.from(out) : undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { q, category, subCategory, subcategory, audience, gender, limit } =
    req.query as Record<string, string | undefined>;

  const filter: any = {};

  // ✅ Category: tolerant matching (e.g., "necklace-pendant" vs "necklaces-pendants")
  if (category) {
    const candidates = categoryCandidatesFor(category);
    filter.category = { $in: candidates };
  }

  // Accept both spellings of subcategory key
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

  /**
   * Audience filtering
   *
   * - Normalize inputs from 'audience' or legacy 'gender'
   * - Build an intersection against product.audience, **always** including "unisex"
   *   when any audience filter is applied, so that unisex items appear in "Him"
   *   and "Her" filtered views.
   * - Keep legacy gender fallback ("male"/"female") to match older docs.
   */
  const wantedCore = normalizeAudienceParam(audience, gender); // -> ["him"], ["her"], or ["him","her"]
  if (wantedCore?.length) {
    // Always include "unisex" when filtering by audience
    const intersectionValues = Array.from(
      new Set<string>([...wantedCore, "unisex"])
    );

    // For legacy docs with 'gender' field
    const legacyMap = wantedCore.map((a) => (a === "him" ? "male" : "female"));

    filter.$or = [
      ...(filter.$or ?? []),
      {
        $expr: {
          $gt: [
            {
              $size: {
                $setIntersection: [
                  { $ifNull: ["$audience", []] },
                  intersectionValues,
                ],
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
