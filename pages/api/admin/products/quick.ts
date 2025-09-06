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

type Ok =
  | { ok: true; id: string; slug: string; name: string; editPath: string }
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
      category,
      subcategory,
      audience,
      baseName: clientBaseName,
    } = (req.body || {}) as {
      department?: Department;
      category?: string;
      subcategory?: string | null;
      audience?: "him" | "her" | "unisex";
      baseName?: string;
    };

    if (!category) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required field: category" });
    }

    // Normalize dept
    const dept: Department =
      department === "watch" ||
      String(category).toLowerCase() === "watch" ||
      String(category).toLowerCase() === "watches"
        ? "watch"
        : "jewelry";

    // Compute base name (prefer client’s, else infer)
    const base = (clientBaseName || baseNameFor(dept, category, subcategory))
      .toString()
      .trim();
    const baseName = base.length ? base : dept === "watch" ? "Watch" : "Item";

    // Find the next sequential number for "Base N"
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

    // Ensure unique slug across PRIMARY and (optional) "products"
    async function slugExists(slug: string) {
      const inPrimary = await products.findOne({ slug }, { projection: { _id: 1 } });
      if (inPrimary) return true;
      if (alsoProducts) {
        const inSecondary = await alsoProducts.findOne({ slug }, { projection: { _id: 1 } });
        if (inSecondary) return true;
      }
      return false;
    }

    let name = `${baseName} ${nextNum}`;
    let slug = slugify(name);
    // Bump until slug is unique
    while (await slugExists(slug)) {
      nextNum += 1;
      name = `${baseName} ${nextNum}`;
      slug = slugify(name);
    }

    // SKU prep (sync to current max just like your multipart POST)
    await ensureSkuCounter(db);
    await syncSkuCounterToMax(db, PRIMARY_COLLECTION);
    const skuNumber = await getNextSkuNumber(db);

    const now = new Date();
    const doc = {
      name,
      title: name,
      slug,
      price: 0,
      salePrice: null as number | null,
      category,
      subCategory: subcategory || null,
      imageUrl: null as string | null,
      images: [] as string[],
      archived: false,
      specs: {} as Record<string, any>,
      audience: [audience || "unisex"],
      description: "",
      department: dept,
      inStock: true,
      featured: false,
      skuNumber,
      createdAt: now,
      updatedAt: now,
    };

    const insert = await products.insertOne(doc);
    const id = String(insert.insertedId);

    return res.status(200).json({
      ok: true,
      id,
      slug,
      name,
      editPath: `/admin/products/${id}`,
    });
  } catch (e: any) {
    console.error("quick-create error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Quick-create failed" });
  }
}
