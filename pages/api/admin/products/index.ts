// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/mongodb"; // ✅ unified DB helper
import formidable, { Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";
// 👇 SKU helpers
import {
  ensureSkuCounter,
  getNextSkuNumber,
  syncSkuCounterToMax,
  resetSkuCounter, // 👈 NEW
} from "@/lib/sku";

export const config = { api: { bodyParser: false } };

type Source = "db" | "legacy";
type AdminProduct = {
  _id?: string;
  id?: string;
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  unitPrice?: number;
  salePrice?: number | null;
  category?: string;
  subcategory?: string | null;
  subCategory?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  images?: string[] | null;
  audience?: string[];
  specs?: Record<string, any>;
  source?: Source;
  archived?: boolean;
  createdAt?: string;
  department?: "jewelry" | "watch";
  skuNumber?: number;

  // 🆕 stock flag
  inStock?: boolean;

  // 🆕 featured flag (NEW)
  featured?: boolean;
};

type Ok =
  | {
      ok: true;
      items: AdminProduct[];
      counts: {
        primary: number;
        alsoProducts: number;
        legacy: number;
        totalAfterDedupe: number;
      };
      collectionsQueried: string[];
      sort?: string;
      dir?: "asc" | "desc";
    }
  | {
      ok: true;
      product: any;
      productId: string;
    }
  // 🆕 bulk delete response
  | {
      ok: true;
      deleted: Record<string, number>;
      collectionsTargeted: string[];
      dryRun?: boolean;
      scope: string;
      includeLegacy?: boolean;
      // 👇 NEW: visibility into counter handling
      skuCounterReset?: boolean;
    };

type Err = { ok: false; error: string };

const PRIMARY_COLLECTION =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

/* -------------------------------------------------------------------------- */
/*                            🧼 Normalization utils                           */
/* -------------------------------------------------------------------------- */

const s = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: any) => {
  if (v == null || v === "") return undefined;
  const num =
    typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(num) ? num : undefined;
};
const toId = (x: any) =>
  typeof x === "string" ? x : x?.toString?.() ?? undefined;

// 🆕 tolerant boolean parser
function toBool(v: any, def = true): boolean {
  if (typeof v === "boolean") return v;
  const str = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!str) return def;
  if (["1", "true", "yes", "on"].includes(str)) return true;
  if (["0", "false", "no", "off"].includes(str)) return false;
  return def;
}

// Slugify
const toSlug = (val: any) =>
  (val ?? "").toString().trim().toLowerCase().replace(/\s+/g, "-");

// 🧭 Canonical category map (plural/aliases → canonical)
const CATEGORY_CANON_MAP: Record<string, string> = {
  rings: "ring",
  ring: "ring",
  bracelets: "bracelet",
  bracelet: "bracelet",
  earrings: "earring",
  earring: "earring",
  necklaces: "necklaces-pendants", // ✅ per your canonicalization
  necklace: "necklaces-pendants",
  "necklaces-pendants": "necklaces-pendants",
  watch: "watch",
  watches: "watch",
  // Add any other aliases here as you encounter them:
  // "men-rings": "ring",
  // "women-rings": "ring",
};

// Some legacy rows stuff subcategory into category, like: "ring/engagement" or "ring > engagement"
function splitCategoryMaybe(catRaw: string): { cat?: string; sub?: string } {
  const raw = s(catRaw).trim();
  if (!raw) return {};
  const sep = [">", "/", "\\", "|", ":"];
  let cat = raw;
  let sub = "";

  for (const ch of sep) {
    if (raw.includes(ch)) {
      const parts = raw.split(ch).map((t) => t.trim());
      if (parts.length >= 2) {
        cat = parts[0];
        sub = parts.slice(1).join(" ");
      }
      break;
    }
  }
  // Also handle "Ring - Engagement" pattern
  if (!sub && /-/.test(raw)) {
    const parts = raw.split("-").map((t) => t.trim());
    if (parts.length >= 2) {
      cat = parts[0];
      sub = parts.slice(1).join(" ");
    }
  }

  const catCanon = CATEGORY_CANON_MAP[toSlug(cat)] || toSlug(cat);
  const subCanon = sub ? toSlug(sub) : undefined;
  return { cat: catCanon, sub: subCanon };
}

// 🧑‍🤝‍🧑 Normalize audience tokens to: "him" | "her" | "unisex"
function normalizeAudienceTokens(aud: any): string[] {
  const arr = Array.isArray(aud)
    ? aud
    : typeof aud === "string"
    ? [aud]
    : ["unisex"];

  const mapped = arr
    .map((v) => toSlug(v))
    .map((tok) => {
      if (["him", "male", "man", "mens", "for-him", "m"].includes(tok))
        return "him";
      if (["her", "female", "woman", "womens", "for-her", "f"].includes(tok))
        return "her";
      if (
        [
          "unisex",
          "any",
          "all",
          "both",
          "adult",
          "couple",
          "everyone",
        ].includes(tok)
      )
        return "unisex";
      // Unknown tokens default to unisex, but keep "kids" etc. as unisex for admin filter consistency
      return "unisex";
    });

  // De-dup with stable order: prioritize single-gender if exclusively present
  const set = new Set(mapped);
  if (set.has("him") && !set.has("her") && !set.has("unisex")) return ["him"];
  if (set.has("her") && !set.has("him") && !set.has("unisex")) return ["her"];
  return ["unisex"]; // if mixed/unknown → admin expects one of "him" | "her" | "unisex"
}

// 🧭 Normalize category + subcategory pair from doc
function normalizeCategoryPair(
  categoryRaw?: any,
  subRaw?: any
): { category?: string; subcategory?: string | undefined } {
  const catStr = s(categoryRaw).trim();
  const subStr = s(subRaw).trim();

  // If category embeds subcategory (e.g., "ring/engagement")
  const split = splitCategoryMaybe(catStr);
  let cat =
    split.cat ||
    (catStr ? CATEGORY_CANON_MAP[toSlug(catStr)] || toSlug(catStr) : undefined);
  let sub = subStr ? toSlug(subStr) : split.sub || undefined;

  // Example: legacy had plural in sub and empty cat; we won't guess parents here if cat is empty
  return {
    category: cat,
    subcategory: sub || undefined,
  };
}

function buildFilter(q: string) {
  if (!q) return {};
  const rx = {
    $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    $options: "i",
  };
  return {
    $or: [
      { name: rx },
      { title: rx },
      { productName: rx },
      { slug: rx },
      { description: rx },
      { category: rx },
      { subCategory: rx },
      { subcategory: rx },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/*                               Adapters (GET)                                */
/* -------------------------------------------------------------------------- */

function adaptDb(doc: any): AdminProduct {
  const id = toId(doc?._id);
  const name = s(doc?.name) || undefined;
  const price = n(doc?.price);
  const salePrice = doc?.salePrice == null ? null : n(doc?.salePrice) ?? null;
  const image = s(doc?.image) || s(doc?.imageUrl) || null;
  const images = Array.isArray(doc?.images) ? doc.images.map(String) : null;

  const { category, subcategory } = normalizeCategoryPair(
    doc?.category,
    doc?.subCategory ?? doc?.subcategory
  );

  const audience = normalizeAudienceTokens(doc?.audience);

  const dept =
    s(doc?.department).toLowerCase() === "watch" ||
    ["watch", "watches"].includes(s(doc?.category).toLowerCase())
      ? "watch"
      : "jewelry";

  return {
    _id: id,
    slug: s(doc?.slug) || id || "",
    name,
    title: name,
    description: s(doc?.description) || undefined,
    price,
    unitPrice: price,
    salePrice,
    category: category || undefined,
    subCategory: subcategory || undefined, // keep both keys for UI compatibility
    subcategory: subcategory || undefined,
    imageUrl: s(doc?.imageUrl) || image,
    image: s(doc?.image) || image,
    images,
    audience,
    specs: doc?.specs && typeof doc.specs === "object" ? doc.specs : {},
    source: "db",
    archived: !!doc?.archived,
    createdAt: doc?.createdAt
      ? new Date(doc.createdAt).toISOString()
      : undefined,
    department: dept as any,
    skuNumber: typeof doc?.skuNumber === "number" ? doc.skuNumber : undefined,

    // 🆕 include stock (default true)
    inStock: typeof doc?.inStock === "boolean" ? doc.inStock : true,

    // 🆕 include featured (default false)
    featured: !!doc?.featured,
  };
}

function adaptLegacy(doc: any): AdminProduct {
  const id = toId(doc?._id);
  const name =
    s(doc?.name) || s(doc?.title) || s(doc?.productName) || "Untitled (legacy)";
  const price = n(doc?.unitPrice ?? doc?.price);
  const img = s(doc?.image) || s(doc?.img) || s(doc?.imageUrl) || null;

  // Gather legacy category inputs (lots of possibilities)
  const rawCat =
    s(doc?.category) ||
    s(doc?.catagory) ||
    s(doc?.cat) ||
    s(doc?.rings) ||
    s(doc?.bracelets) ||
    s(doc?.necklaces) ||
    s(doc?.earrings) ||
    "";
  const rawSub =
    s(doc?.subCategory) || s(doc?.subcategory) || s(doc?.subcatagory) || "";

  const { category, subcategory } = normalizeCategoryPair(rawCat, rawSub);

  const audience = normalizeAudienceTokens(doc?.audience);

  const dept =
    s(doc?.department).toLowerCase() === "watch" ||
    ["watch", "watches"].includes(s(rawCat).toLowerCase())
      ? "watch"
      : "jewelry";

  return {
    id,
    slug: s(doc?.slug) || id || "",
    name,
    title: name,
    description: s(doc?.description) || undefined,
    price,
    unitPrice: price,
    salePrice: n(doc?.salePrice) ?? null,
    category: category || undefined,
    subCategory: subcategory || undefined,
    subcategory: subcategory || undefined,
    imageUrl: s(doc?.imageUrl) || img,
    image: s(doc?.image) || img,
    images: null,
    audience,
    specs: doc?.specs && typeof doc.specs === "object" ? doc.specs : {},
    source: "legacy",
    archived: !!doc?.archived,
    createdAt: doc?.createdAt
      ? new Date(doc.createdAt).toISOString()
      : undefined,
    department: dept as any,
    skuNumber: typeof doc?.skuNumber === "number" ? doc.skuNumber : undefined,

    // 🆕 legacy assumed in stock unless explicitly false
    inStock: doc?.inStock !== false,

    // 🆕 legacy featured defaults to false unless explicitly true
    featured: !!doc?.featured,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Multipart parsing                               */
/* -------------------------------------------------------------------------- */

function parseForm(
  req: NextApiRequest
): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

function toAudience(v: any): string[] {
  // Accept array, JSON string, or single value
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return [v];
  }
  return ["unisex"];
}

function toSpecs(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    const parsed = JSON.parse(String(v));
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

/* -------------------------------------------------------------------------- */
/*                               Sorting helpers                               */
/* -------------------------------------------------------------------------- */

function getSortKeyAndDir(req: NextApiRequest) {
  const allowed = new Set([
    "createdAt",
    "name",
    "price",
    "salePrice",
    "category",
    "department",
    "skuNumber",
  ]);
  const sort =
    typeof req.query.sort === "string" && allowed.has(req.query.sort)
      ? (req.query.sort as string)
      : "createdAt";
  const dir =
    typeof req.query.dir === "string" &&
    (req.query.dir.toLowerCase() === "asc" ||
      req.query.dir.toLowerCase() === "desc")
      ? (req.query.dir.toLowerCase() as "asc" | "desc")
      : "desc";
  return { sort, dir };
}

function valFor(p: AdminProduct, key: string): any {
  switch (key) {
    case "createdAt":
      return p.createdAt ? new Date(p.createdAt).getTime() : 0;
    case "name":
      return (p.name || p.title || "").toString();
    case "price":
      return typeof p.price === "number"
        ? p.price
        : typeof p.unitPrice === "number"
        ? p.unitPrice
        : 0;
    case "salePrice":
      return p.salePrice == null
        ? Number.POSITIVE_INFINITY
        : Number(p.salePrice);
    case "category":
      return (p.category || "").toString();
    case "department":
      return (p.department || "").toString();
    case "skuNumber":
      return typeof p.skuNumber === "number" ? p.skuNumber : 0;
    default:
      return 0;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Handler                                    */
/* -------------------------------------------------------------------------- */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  // Admin gate
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  // -------------------- LIST (GET) --------------------
  if (req.method === "GET") {
    const db = await getDb();

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const includeLegacy =
      String(req.query.includeLegacy ?? "1").toLowerCase() !== "0" &&
      String(req.query.includeLegacy ?? "1").toLowerCase() !== "false";
    const filter = buildFilter(q);
    const { sort, dir } = getSortKeyAndDir(req);

    const collectionsToQuery = Array.from(
      new Set([PRIMARY_COLLECTION, "products"])
    );

    const results: AdminProduct[] = [];
    let primaryCount = 0;
    let alsoProductsCount = 0;

    for (const colName of collectionsToQuery) {
      try {
        const docs = await (await getDb())
          .collection(colName)
          .find(filter)
          .toArray();
        const mapped = docs.map(adaptDb);
        results.push(...mapped);
        if (colName === PRIMARY_COLLECTION) primaryCount = mapped.length;
        if (colName === "products" && colName !== PRIMARY_COLLECTION)
          alsoProductsCount = mapped.length;
      } catch {
        // collection may not exist; skip
      }
    }

    // legacy (optional)
    let legacy: AdminProduct[] = [];
    let legacyCount = 0;
    if (includeLegacy) {
      try {
        const legacyDocs = await (await getDb())
          .collection("legacyProducts")
          .find(filter)
          .toArray();
        legacy = legacyDocs.map(adaptLegacy);
        legacyCount = legacy.length;
      } catch {
        legacy = [];
      }
    }

    // Dedup by slug, prefer DB over legacy
    const seen = new Map<string, AdminProduct>();
    function keyFor(p: AdminProduct) {
      return (p.slug && p.slug.trim()) || (p._id ?? p.id ?? "");
    }
    for (const p of [...results, ...legacy]) {
      const k = keyFor(p);
      if (!k) continue;
      if (
        !seen.has(k) ||
        (seen.get(k)?.source === "legacy" && p.source === "db")
      ) {
        seen.set(k, p);
      }
    }

    // Final items, sorted
    const items = Array.from(seen.values()).sort((a, b) => {
      const { dir } = getSortKeyAndDir(req);
      const av = valFor(a, sort);
      const bv = valFor(b, sort);

      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        const na = typeof av === "number" ? av : Number(av) || 0;
        const nb = typeof bv === "number" ? bv : Number(bv) || 0;
        cmp = na === nb ? 0 : na < nb ? -1 : 1;
      }
      if (cmp !== 0) return cmp * (dir === "asc" ? 1 : -1);

      // tie-break 1: prefer DB over legacy
      if (a.source !== b.source) {
        return a.source === "db" ? -1 : 1;
      }
      // tie-break 2: createdAt desc
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });

    return res.status(200).json({
      ok: true,
      items,
      counts: {
        primary: primaryCount,
        alsoProducts: alsoProductsCount,
        legacy: legacyCount,
        totalAfterDedupe: items.length,
      },
      collectionsQueried: collectionsToQuery,
      sort,
      dir,
    });
  }

  // -------------------- CREATE (POST, multipart) --------------------
  if (req.method === "POST") {
    try {
      const db = await getDb();
      const products = db.collection(PRIMARY_COLLECTION);
      const { fields, files } = await parseForm(req);

      // Ensure SKU counter exists & synced to current max
      await ensureSkuCounter(db);
      await syncSkuCounterToMax(db, PRIMARY_COLLECTION);

      // Pull fields (mirror ProductForm)
      const title = s(fields.title ?? fields.name);
      const slug = s(fields.slug ?? fields.title ?? fields.name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
      if (!title || !slug) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing required: title/name and slug" });
      }

      const department = s(fields.department);
      // 🧼 Normalize category + subcategory on create
      const normPair = normalizeCategoryPair(
        s(fields.category),
        s(fields.subCategory || fields.subcategory)
      );
      const category = normPair.category || undefined;
      const subCategory = normPair.subcategory || "";

      const price = n(fields.unitPrice ?? fields.price) ?? 0;
      const salePrice =
        fields.salePrice == null ? null : n(fields.salePrice) ?? null;
      const archived = String(fields.archived ?? "").length
        ? String(fields.archived).toLowerCase() === "true" ||
          String(fields.archived) === "1"
        : false;

      // 🧼 Normalize audience on create
      const audience = normalizeAudienceTokens(toAudience(fields.audience));
      const specs = toSpecs(fields.specs);
      const description = s(fields.description);

      // 🆕 stock parsing (default true)
      const inStock = toBool(fields.inStock, true);

      // 🆕 featured parsing (default false)
      const featured = toBool(fields.featured, false);

      // Optional image file
      let imageUrl: string | null = null;
      const file: any = (files as any)?.image;
      if (file?.filepath) {
        const upload = await cloudinary.uploader.upload(file.filepath, {
          folder: "classy-products",
          overwrite: true,
          resource_type: "image",
        });
        imageUrl = upload.secure_url;
      }

      // 🔁 Normalize select specs to top-level fields used by storefront filters
      const normalized: Record<string, any> = {};
      if (specs.metal) normalized.metal = toSlug(specs.metal);
      if (specs.stone) normalized.stone = toSlug(specs.stone);
      if (specs.shape) normalized.shape = toSlug(specs.shape);
      if (specs.style) normalized.style = toSlug(specs.style);
      if (specs.color) normalized.color = toSlug(specs.color);
      if (specs.clarity) normalized.clarity = toSlug(specs.clarity);
      if (specs.cut) normalized.cut = toSlug(specs.cut);
      if (specs.carat && !Number.isNaN(Number(specs.carat))) {
        normalized.carat = Number(specs.carat);
      }

      // ✅ SKU: honor explicit, otherwise assign next number
      const explicitSku = Number(fields.skuNumber);
      const skuNumber = Number.isFinite(explicitSku)
        ? explicitSku
        : await getNextSkuNumber(db);

      // 🛑 Enforce max 4 featured products (exclude same slug in upsert case)
      if (featured) {
        const currentFeaturedCount = await products.countDocuments({
          featured: true,
          slug: { $ne: slug },
        });
        if (currentFeaturedCount >= 4) {
          return res
            .status(409)
            .json({ ok: false, error: "Featured limit reached (max 4)." });
        }
      }

      const now = new Date();
      const doc = {
        name: title,
        title,
        slug,
        price,
        salePrice,
        category,
        subCategory: subCategory || null,
        ...(normalized.metal ? { metal: normalized.metal } : {}),
        ...(normalized.stone ? { stone: normalized.stone } : {}),
        ...(normalized.shape ? { shape: normalized.shape } : {}),
        ...(normalized.style ? { style: normalized.style } : {}),
        ...(normalized.color ? { color: normalized.color } : {}),
        ...(normalized.clarity ? { clarity: normalized.clarity } : {}),
        ...(normalized.carat !== undefined ? { carat: normalized.carat } : {}),
        imageUrl,
        images: imageUrl ? [imageUrl] : undefined,
        archived,
        specs, // full specs for PDP
        audience, // ✅ normalized audience
        description,
        department:
          department === "watch" || department === "jewelry"
            ? department
            : undefined,
        // 🆕 persist stock
        inStock,
        // 🆕 persist featured
        featured,
        skuNumber, // 👈 store the sequence
        createdAt: now,
        updatedAt: now,
      };

      // Upsert by slug (so repeat migrations don’t duplicate)
      const { value } = await products.findOneAndUpdate(
        { slug },
        { $set: doc, $setOnInsert: { createdAt: now } },
        { upsert: true, returnDocument: "after" }
      );

      return res
        .status(200)
        .json({ ok: true, productId: String(value?._id), product: value });
    } catch (e: any) {
      console.error("create error:", e);
      return res
        .status(500)
        .json({ ok: false, error: e?.message || "Create failed" });
    }
  }

  // -------------------- BULK DELETE (DELETE) --------------------
  // ⚠️ Uses query params (body parser is disabled). Safe defaults + dryRun support.
  if (req.method === "DELETE") {
    try {
      const db = await getDb();

      // Require an explicit "all" flag so accidental deletes don't happen.
      const all = toBool((req.query as any).all, false);
      if (!all) {
        return res.status(400).json({
          ok: false,
          error:
            "Refused. Pass ?all=1 to confirm bulk deletion. Optionally add &dryRun=1 first.",
        });
      }

      // scope: which collections to target
      // - "primary" (default): PRIMARY_COLLECTION only
      // - "products": "products" only
      // - "both": PRIMARY_COLLECTION + "products" (if different)
      // - "all": PRIMARY_COLLECTION + "products" (+ legacy if includeLegacy=1)
      const scope = String((req.query as any).scope ?? "primary").toLowerCase();
      const includeLegacy = toBool((req.query as any).includeLegacy, false);
      const dryRun = toBool((req.query as any).dryRun, false);

      const targets: string[] = [];
      const addIf = (name: string) => {
        if (!targets.includes(name)) targets.push(name);
      };

      if (scope === "primary") {
        addIf(PRIMARY_COLLECTION);
      } else if (scope === "products") {
        addIf("products");
      } else if (scope === "both") {
        addIf(PRIMARY_COLLECTION);
        if (PRIMARY_COLLECTION !== "products") addIf("products");
      } else if (scope === "all") {
        addIf(PRIMARY_COLLECTION);
        if (PRIMARY_COLLECTION !== "products") addIf("products");
        if (includeLegacy) addIf("legacyProducts");
      } else {
        // unknown scope -> default to primary for safety
        addIf(PRIMARY_COLLECTION);
      }

      // If legacy requested explicitly with another scope
      if (includeLegacy && !targets.includes("legacyProducts")) {
        addIf("legacyProducts");
      }

      const deleted: Record<string, number> = {};
      for (const col of targets) {
        try {
          if (dryRun) {
            // count only
            deleted[col] = await db.collection(col).countDocuments({});
          } else {
            const result = await db.collection(col).deleteMany({});
            deleted[col] = result.deletedCount ?? 0;
          }
        } catch (e) {
          // If the collection doesn't exist, report zero
          deleted[col] = 0;
        }
      }

      // ✅ Reset SKU counter only on real purges of the PRIMARY collection
      // (scope includes PRIMARY_COLLECTION and not a dry-run).
      let skuCounterReset = false;
      if (!dryRun && targets.includes(PRIMARY_COLLECTION)) {
        await resetSkuCounter(db);
        skuCounterReset = true;
      }

      return res.status(200).json({
        ok: true,
        deleted,
        collectionsTargeted: targets,
        dryRun: dryRun || undefined,
        scope,
        includeLegacy: includeLegacy || undefined,
        skuCounterReset, // 👈 visibility in response
      });
    } catch (e: any) {
      console.error("bulk delete error:", e);
      return res
        .status(500)
        .json({ ok: false, error: e?.message || "Bulk delete failed" });
    }
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
