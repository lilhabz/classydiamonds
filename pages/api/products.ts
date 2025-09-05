// 📄 pages/api/products.ts – GET list / POST create (audience-aware) 🛠️
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";

type Audience = "him" | "her";

function mapGenderToAudience(g: string): Audience | null {
  const v = g?.toLowerCase();
  if (v === "male" || v === "men" || v === "him") return "him";
  if (v === "female" || v === "women" || v === "her") return "her";
  return null;
}

function normalizeAudienceParam(
  aud?: string,
  gen?: string
): Audience[] | undefined {
  const vals = [...(aud ? aud.split(",") : []), ...(gen ? gen.split(",") : [])]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!vals.length) return undefined;

  const mapped = vals
    .map((v) => (v === "male" ? "him" : v === "female" ? "her" : v))
    .map((v) => (v === "him" || v === "her" ? (v as Audience) : null))
    .filter(Boolean) as Audience[];

  return Array.from(new Set(mapped));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection("products");

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};

      // 🛡️ Basic validation (keep your required fields)
      if (
        !body.name ||
        !body.price ||
        !body.image ||
        !body.category ||
        !body.slug
      ) {
        return res
          .status(400)
          .json({ message: "Missing required product fields" });
      }

      // ✅ Normalize audience if only legacy `gender` provided
      let audience: Audience[] | undefined;
      if (Array.isArray(body.audience)) {
        audience = Array.from(
          new Set(
            body.audience
              .map((a: string) => a?.toLowerCase())
              .map((a: string) =>
                a === "male" ? "him" : a === "female" ? "her" : a
              )
              .filter((a: string) => a === "him" || a === "her")
          )
        ) as Audience[];
      } else if (body.gender) {
        const gens = Array.isArray(body.gender) ? body.gender : [body.gender];
        audience = Array.from(
          new Set(gens.map(mapGenderToAudience).filter(Boolean))
        ) as Audience[];
        delete body.gender; // remove legacy field on insert
      }

      const doc = {
        ...body,
        audience, // may be undefined; that’s fine
        createdAt: body.createdAt ?? new Date(),
      };

      const result = await col.insertOne(doc);
      const created = await col.findOne({ _id: result.insertedId });
      return res.status(201).json(created);
    } catch (err) {
      console.error("Error creating product:", err);
      return res.status(500).json({ message: "Error creating new product" });
    }
  }

  if (req.method === "GET") {
    try {
      const {
        category,
        subcategory,
        department,
        q,
        featured,
        audience: audienceQuery,
        gender: legacyGenderQuery, // backward-compat
        limit,
        skip,
        sort = "createdAt:desc",
      } = req.query as Record<string, string | undefined>;

      const wantedAudience = normalizeAudienceParam(
        audienceQuery,
        legacyGenderQuery
      );

      const filter: any = {};
      if (category) filter.category = category;
      if (subcategory) filter.subcategory = subcategory;
      if (department) filter.department = department;
      if (featured === "true") filter.featured = true;

      if (q) {
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { slug: { $regex: q, $options: "i" } },
        ];
      }

      // 🎯 Audience-aware filter (OR against legacy gender for old docs)
      if (wantedAudience?.length) {
        const legacyMap = wantedAudience.map((a) =>
          a === "him" ? "male" : "female"
        );
        filter.$or = [
          ...(filter.$or ?? []),
          { audience: { $in: wantedAudience } },
          { gender: { $in: legacyMap } },
        ];
      }

      // sorting like "createdAt:desc" or "price:asc"
      const [sortField, sortDir = "desc"] = String(sort).split(":");
      const sortSpec: Record<string, 1 | -1> = {
        [sortField]: sortDir === "asc" ? 1 : -1,
      };

      const cursor = col.find(filter).sort(sortSpec);

      if (skip) cursor.skip(parseInt(skip, 10) || 0);
      if (limit) cursor.limit(parseInt(limit, 10) || 24);

      const products = await cursor.toArray();
      return res.status(200).json(products);
    } catch (err) {
      console.error("Error fetching products:", err);
      return res.status(500).json({ message: "Error fetching products" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
