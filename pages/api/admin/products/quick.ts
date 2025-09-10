// pages/api/admin/products/quick.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/mongodb";
import {
  ensureSkuCounter,
  getNextSkuNumber,
  syncSkuCounterToMax,
} from "@/lib/sku";

type CreatedItem = { id: string; slug: string; name: string; editPath: string };

type Ok =
  | { ok: true; count: number; created: CreatedItem[] }
  | { ok: false; error: string };

type Department = "jewelry" | "watch";

/** Use the same env-driven primary collection as the main API */
const PRIMARY_COLLECTION =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

/** Minimal slugify (no dependency) */
function slugify(s: string): string {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(s: string): string {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function singularizeBasic(word: string): string {
  const w = word.toLowerCase();
  if (w === "watches") return "watch";
  if (w === "earrings") return "earring";
  if (w === "necklaces") return "necklace";
  if (w === "pendants") return "pendant";
  if (w === "bracelets") return "bracelet";
  if (w === "rings") return "ring";
  if (w === "necklaces-pendants") return "pendant";
  if (/for-(him|her)/.test(w)) return "jewelry";
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/* ----------------------- Storefront canonicalization ---------------------- */
/** Ring subcategories used on the storefront (add as needed) */
const RING_SUBCATS = new Set([
  "engagement",
  "wedding",
  "wedding-bands",
  "eternity",
  "promise",
  "fashion",
  "anniversary",
  "halo",
  "solitaire",
  "three-stone",
  "bridal-set",
  "mens",
]);

/**
 * Normalize ring subcategory to storefront routes while keeping a base alias:
 * - "engagement" => route "engagement-rings", base "engagement"
 * - "wedding"    => route "wedding-bands",   base "wedding-bands"
 * - already-suffixed (e.g., "engagement-rings") stays as route and base trims "-rings"
 * - categories like "mens" remain as-is (no "-rings")
 */
function normalizeRingSubcategory(sub: string | null): {
  route: string | null;
  base: string | null;
} {
  if (!sub) return { route: null, base: null };
  let s = sub.trim().toLowerCase();
  if (!s) return { route: null, base: null };

  // Standardize "wedding" → "wedding-bands"
  if (s === "wedding") s = "wedding-bands";

  // If already suffixed with "-rings", keep it; base = trimmed
  if (/-rings$/.test(s)) {
    return { route: s, base: s.replace(/-rings$/, "") };
  }

  // Subcats that get the "-rings" route suffix
  const suffixable = new Set([
    "engagement",
    "eternity",
    "promise",
    "fashion",
    "anniversary",
    "halo",
    "solitaire",
    "three-stone",
    "bridal-set",
  ]);

  if (suffixable.has(s)) {
    return { route: `${s}-rings`, base: s };
  }

  // Non-suffix categories (e.g., "wedding-bands", "mens")
  return { route: s, base: s };
}

/** Return storefront-friendly { category, subcategory } */
function canonicalizeCategoryAndSubcategory(
  rawCategory?: string | null,
  rawSubcategory?: string | null
): { category: string; subcategory: string | null } {
  const c = String(rawCategory || "").toLowerCase();
  const s =
    (rawSubcategory == null ? null : String(rawSubcategory).toLowerCase()) ||
    null;

  // If admin passed a ring *subcategory* as "category", treat it as rings/<sub>
  if (RING_SUBCATS.has(c)) {
    const { route } = normalizeRingSubcategory(c);
    return { category: "rings", subcategory: route };
  }

  // Known singular→plural / canonical merges
  if (c === "ring" || c === "rings") {
    const { route } = normalizeRingSubcategory(s);
    return { category: "rings", subcategory: route };
  }
  if (c === "earring" || c === "earrings")
    return { category: "earrings", subcategory: s };
  if (c === "bracelet" || c === "bracelets")
    return { category: "bracelets", subcategory: s };
  if (c === "watch" || c === "watches")
    return { category: "watches", subcategory: s };
  if (c === "chain" || c === "chains")
    return { category: "chains", subcategory: s };

  // Necklaces + pendants are merged on storefront
  if (
    c === "necklace" ||
    c === "pendant" ||
    c === "necklaces" ||
    c === "pendants" ||
    c === "necklaces-pendants"
  ) {
    return { category: "necklaces-pendants", subcategory: s };
  }

  // Gender rails are already storefront categories
  if (c === "for-him" || c === "for-her") {
    return { category: c, subcategory: s };
  }

  // Fallback: leave as-is (still lowercased)
  return { category: c, subcategory: s };
}

/** Mirrors the front-end heuristic so base names are consistent */
function baseNameFor(
  dept: Department,
  category?: string | null,
  sub?: string | null
): string {
  const c = String(category || "").toLowerCase();
  const s = String(sub || "").toLowerCase();

  if (dept === "watch" || c === "watch" || c === "watches") return "Watch";

  if (/(pendant|medallion)/.test(s)) return "Pendant";
  if (/necklace/.test(s)) return "Necklace";
  if (/bracelet/.test(s)) return "Bracelet";
  if (/earring/.test(s)) return "Earring";
  if (/ring/.test(s)) return "Ring";
  if (/chain/.test(s)) return "Chain";

  if (/engagement/.test(c)) return "Ring";
  if (/rings?/.test(c)) return "Ring";
  if (/bracelets?/.test(c)) return "Bracelet";
  if (/necklaces?/.test(c)) return "Necklace";
  if (/pendants?/.test(c)) return "Pendant";
  if (/earrings?/.test(c)) return "Earring";
  if (/chains?/.test(c)) return "Chain";
  if (c === "necklaces-pendants") return "Pendant";
  if (/for-(him|her)/.test(c)) return "Jewelry";

  if (c) return titleCase(singularizeBasic(c));
  return "Item";
}

export const config = { api: { bodyParser: true } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok>
) {
  // Admin gate
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const db = await getDb();
    const products = db.collection(PRIMARY_COLLECTION);
    const alsoProducts =
      PRIMARY_COLLECTION !== "products" ? db.collection("products") : null;

    // Input (from index.tsx quickCreate)
    const {
      department,
      category: rawCategory,
      subcategory: rawSubcategory,
      audience,
      baseName: clientBaseName,
      quantity,
      qty,
    } = (req.body || {}) as {
      department?: Department;
      category?: string;
      subcategory?: string | null;
      audience?: "him" | "her" | "unisex";
      baseName?: string;
      quantity?: number;
      qty?: number;
    };

    if (!rawCategory) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required field: category" });
    }

    // ✅ Canonical storefront slugs (rings subcats get normalized route slugs)
    const { category, subcategory: subFromCanon } =
      canonicalizeCategoryAndSubcategory(rawCategory, rawSubcategory);

    // For rings, compute both the route slug (with -rings where applicable)
    // and a base alias (without -rings) for backward compatibility.
    const isRings = category === "rings";
    const { route: subcategoryRoute, base: subcategoryBase } = isRings
      ? normalizeRingSubcategory(subFromCanon)
      : { route: subFromCanon, base: subFromCanon };

    // Normalize dept after canonicalization
    const dept: Department =
      category === "watches"
        ? "watch"
        : department === "watch"
        ? "watch"
        : "jewelry";

    // Compute base name (prefer client’s, else infer)
    const base = (
      clientBaseName || baseNameFor(dept, category, subcategoryRoute)
    )
      .toString()
      .trim();
    const baseName = base.length ? base : dept === "watch" ? "Watch" : "Item";

    // Desired count (cap to a reasonable upper bound)
    const countRaw = Number.isFinite(quantity) ? quantity : qty;
    const count = Math.max(1, Math.min(100, Number(countRaw) || 1));

    // Helper: ensure unique slug across PRIMARY and (optional) "products"
    async function slugExists(slug: string) {
      const inPrimary = await products.findOne(
        { slug },
        { projection: { _id: 1 } }
      );
      if (inPrimary) return true;
      if (alsoProducts) {
        const inSecondary = await alsoProducts.findOne(
          { slug },
          { projection: { _id: 1 } }
        );
        if (inSecondary) return true;
      }
      return false;
    }

    // Find the starting number for "Base N" (scan by name pattern in PRIMARY)
    const rx = new RegExp(`^${escapeRegex(baseName)}\\s+(\\d+)$`, "i");
    const matchQuery = {
      name: { $regex: `^${escapeRegex(baseName)}\\s+\\d+$`, $options: "i" },
    };
    const existing = await products
      .find(matchQuery, { projection: { name: 1 } })
      .toArray();

    let maxN = 0;
    for (const doc of existing) {
      const m = String(doc?.name || "").match(rx);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    let nextNum = maxN + 1;

    // SKU prep (sync to current max just like your multipart POST)
    await ensureSkuCounter(db);
    await syncSkuCounterToMax(db, PRIMARY_COLLECTION);

    const now = new Date();

    // Build docs (unique name/slug + unique SKU per doc)
    const docs: any[] = [];
    const planned: { name: string; slug: string }[] = [];

    for (let i = 0; i < count; i++) {
      // Propose name/slug and bump until slug is unique globally
      let name = `${baseName} ${nextNum}`;
      let slug = slugify(name);
      while (await slugExists(slug)) {
        nextNum += 1;
        name = `${baseName} ${nextNum}`;
        slug = slugify(name);
      }

      const skuNumber = await getNextSkuNumber(db);

      const doc = {
        name,
        title: name,
        slug,
        price: 0,
        salePrice: null as number | null,

        // ✅ Storefront-canonical fields
        category, // e.g., "rings", "necklaces-pendants"
        subcategory: subcategoryRoute, // e.g., "engagement-rings"
        subCategory: subcategoryBase, // e.g., "engagement" (back-compat alias)

        imageUrl: null as string | null,
        images: [] as string[],
        archived: false,
        specs: {} as Record<string, any>,

        // ⬇️ CHANGED: respect selection; only set when provided
        audience: audience ? [audience] : [],

        description: "",
        department: dept,
        inStock: true,
        featured: false,
        skuNumber,
        createdAt: now,
        updatedAt: now,
      };

      docs.push(doc);
      planned.push({ name, slug });

      nextNum += 1; // advance for the next proposal
    }

    // Insert
    let created: CreatedItem[] = [];
    if (docs.length === 1) {
      const insert = await products.insertOne(docs[0]);
      const id = String(insert.insertedId);
      created = [
        {
          id,
          slug: planned[0].slug,
          name: planned[0].name,
          editPath: `/admin/products/${id}`,
        },
      ];
    } else {
      const insertManyRes = await products.insertMany(docs);
      // insertMany returns an object map of index -> ObjectId
      created = Object.keys(insertManyRes.insertedIds)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => {
          const idx = Number(k);
          const id = String(insertManyRes.insertedIds[idx]);
          return {
            id,
            slug: planned[idx].slug,
            name: planned[idx].name,
            editPath: `/admin/products/${id}`,
          };
        });
    }

    return res.status(200).json({
      ok: true,
      count: created.length,
      created,
    });
  } catch (e: any) {
    console.error("quick-create error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Quick-create failed" });
  }
}
