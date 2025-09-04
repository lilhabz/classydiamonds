// 📦 lib/products.ts
// Unifies all readers/writers on ONE Mongo client + ONE collection name.
// - Uses getDb()/getCollection() from lib/mongodb (no duplicate clients).
// - Deterministic catalog name (no silent "probing" divergence).
// - Honors PRODUCTS_COLLECTION (server) or NEXT_PUBLIC_PRODUCTS_COLLECTION (fallback), else 'products'.

import { ObjectId } from "mongodb";
import type { Product } from "@/types/product";
import { getDb, getCollection } from "@/lib/mongodb";

const SERVER_COLLECTION =
  (process.env.PRODUCTS_COLLECTION as string | undefined) ||
  (process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION as string | undefined) ||
  "products";

// 🔎 Optional safety: if explicit collection is empty but 'products' has data, fallback.
let _resolvedCollectionName: string | null = null;

async function resolveCatalogCollectionName(): Promise<string> {
  if (_resolvedCollectionName) return _resolvedCollectionName;

  const db = await getDb();
  const explicit = SERVER_COLLECTION;

  // If explicit is 'products', just use it.
  if (explicit === "products") {
    _resolvedCollectionName = "products";
    return _resolvedCollectionName;
  }

  // If explicit is something else, prefer it if it actually has any docs.
  const explicitCol = db.collection(explicit);
  const explicitHasDocs = await explicitCol.findOne(
    {},
    { projection: { _id: 1 } }
  );

  if (explicitHasDocs) {
    _resolvedCollectionName = explicit;
    return _resolvedCollectionName;
  }

  // If explicit exists but is empty, check 'products' to avoid empty admin views.
  const productsCol = db.collection("products");
  const productsHasDocs = await productsCol.findOne(
    {},
    { projection: { _id: 1 } }
  );

  if (productsHasDocs) {
    console.warn(
      `[catalog] '${explicit}' is empty; falling back to 'products'. Set PRODUCTS_COLLECTION='products' to silence this.`
    );
    _resolvedCollectionName = "products";
    return _resolvedCollectionName;
  }

  // Last resort: stick with explicit (even if empty)
  _resolvedCollectionName = explicit;
  return _resolvedCollectionName;
}

async function getProductsCollection() {
  const name = await resolveCatalogCollectionName();
  return getCollection(name);
}

/* ---------------- Legacy normalization helpers ---------------- */
function inferDepartment(doc: any): "jewelry" | "watch" {
  const d = String(doc?.department || "").toLowerCase();
  if (d === "watch") return "watch";
  const cat = String(doc?.category || "").toLowerCase();
  if (cat === "watch" || cat === "watches") return "watch";
  return "jewelry";
}
function firstImage(doc: any): string {
  if (doc?.imageUrl) return String(doc.imageUrl);
  if (Array.isArray(doc?.images) && doc.images.length)
    return String(doc.images[0]);
  if (doc?.image) return String(doc.image);
  return "";
}

/** 🧠 Robust in-stock inference used everywhere (lists & detail) */
function inferInStock(doc: any): boolean {
  if (typeof doc?.inStock === "boolean") return doc.inStock;
  if (typeof doc?.stock === "boolean") return doc.stock;
  if (typeof doc?.quantity === "number") return doc.quantity > 0;
  return true; // default to visible for legacy items
}

/** Map raw Mongo doc -> typed Product (omit legacy `tags`) */
export function mapDbToProduct(doc: any): Product {
  return {
    _id: String(doc._id),
    title: doc.title ?? doc.name ?? "",
    slug: doc.slug,
    department: inferDepartment(doc),
    category: doc.category,
    subCategory: doc.subCategory ?? doc.subcategory,
    audience:
      Array.isArray(doc.audience) && doc.audience.length
        ? doc.audience
        : ["unisex"],
    price: doc.price ?? doc.unitPrice,
    originalPrice: doc.originalPrice,
    salePrice: doc.salePrice,
    discountedPrice: doc.discountedPrice,
    unitPrice: doc.unitPrice ?? doc.price,
    imageUrl: firstImage(doc),
    images: Array.isArray(doc.images)
      ? doc.images
      : firstImage(doc)
      ? [firstImage(doc)]
      : [],
    description: doc.description ?? "",
    specs: doc.specs && typeof doc.specs === "object" ? doc.specs : undefined,
    featured: typeof doc.featured === "boolean" ? doc.featured : undefined,
    skuNumber: typeof doc.skuNumber === "number" ? doc.skuNumber : undefined,

    /** ✅ Real stock flag (robust inference) */
    inStock: inferInStock(doc),

    createdAt: doc.createdAt ? String(doc.createdAt) : undefined,
    updatedAt: doc.updatedAt ? String(doc.updatedAt) : undefined,
  };
}

/** Optional: normalize outgoing product before write */
function normalizeForWrite(input: Partial<Product>): any {
  const out: any = { ...input };

  // keep legacy consumers happy
  if (out.title && !out.name) out.name = out.title;
  if (out.subCategory == null && (out as any).subcategory) {
    out.subCategory = (out as any).subcategory;
  }

  // images/imageUrl sync
  if (Array.isArray(out.images) && out.images.length) {
    out.imageUrl = out.imageUrl || out.images[0];
  } else if (out.imageUrl && (!out.images || out.images.length === 0)) {
    out.images = [out.imageUrl];
  }

  // ensure boolean for inStock if present
  if (out.inStock !== undefined) out.inStock = !!out.inStock;

  // remove undefined to avoid overwriting with undefined
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);

  return out;
}

/* ---------------- Queries & CRUD ---------------- */
type ListOptions = {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
};

export async function listProducts(
  filter: any = {},
  options: ListOptions = {}
) {
  const col = await getProductsCollection();
  const cursor = col
    .find(filter)
    .sort(options.sort ?? { createdAt: -1 })
    .limit(options.limit ?? 1000)
    .skip(options.skip ?? 0);

  const rows = await cursor.toArray();
  return rows.map(mapDbToProduct);
}

export async function getProductById(id: string) {
  const col = await getProductsCollection();
  const _id = new ObjectId(id);
  const doc = await col.findOne({ _id });
  return doc ? mapDbToProduct(doc) : null;
}

/** Allow legacy payloads to contain `tags` but drop them before insert */
type LegacyCreate = Omit<Product, "_id"> & { tags?: string[] };

export async function createProduct(input: LegacyCreate) {
  const col = await getProductsCollection();
  const { tags: _legacyTags, ...clean } = input; // strip tags
  const now = new Date();

  const toInsert = normalizeForWrite({
    // default true if absent (legacy)
    inStock:
      typeof clean.inStock === "boolean"
        ? clean.inStock
        : inferInStock(clean as any),
    ...clean,
    createdAt: now,
    updatedAt: now,
  });

  const result = await col.insertOne(toInsert);
  const saved = await col.findOne({ _id: result.insertedId });
  return saved ? mapDbToProduct(saved) : null;
}

/** Drop legacy `tags` in patch; keep imageUrl/images in sync */
type LegacyPatch = Partial<Product> & { tags?: string[] };

export async function updateProduct(id: string, patch: LegacyPatch) {
  const col = await getProductsCollection();
  const _id = new ObjectId(id);

  const { tags: _legacyTags, ...clean } = patch; // strip tags
  const updateSet = normalizeForWrite({
    ...clean,
    updatedAt: new Date(),
  });

  if (Object.keys(updateSet).length === 0) {
    const fresh = await col.findOne({ _id });
    return fresh ? mapDbToProduct(fresh) : null;
  }

  await col.updateOne({ _id }, { $set: updateSet });
  const saved = await col.findOne({ _id });
  return saved ? mapDbToProduct(saved) : null;
}

export async function deleteProduct(id: string) {
  const col = await getProductsCollection();
  const _id = new ObjectId(id);
  await col.deleteOne({ _id });
  return { ok: true };
}

/* -------- Optional: query helpers compatible with your API -------- */
export function buildSearchFilter(qs: {
  department?: string;
  category?: string;
  subCategory?: string;
  q?: string;
  audienceCsv?: string;
  specsJson?: string;
}) {
  const filter: any = {};

  if (qs.department) {
    filter.$or = [
      ...(filter.$or || []),
      { department: qs.department },
      { category: qs.department }, // legacy
    ];
  }
  if (qs.category) filter.category = qs.category;

  if (qs.subCategory) {
    filter.$or = [
      ...(filter.$or || []),
      { subCategory: qs.subCategory },
      { subcategory: qs.subCategory }, // legacy
    ];
  }

  if (qs.q && qs.q.trim()) {
    filter.$or = [
      ...(filter.$or || []),
      { name: { $regex: qs.q, $options: "i" } },
      { title: { $regex: qs.q, $options: "i" } },
      { description: { $regex: qs.q, $options: "i" } },
      { tags: { $regex: qs.q, $options: "i" } }, // tolerate legacy "tags" in DB
    ];
  }

  if (qs.audienceCsv) {
    const a = qs.audienceCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (a.length) {
      filter.$expr = {
        $gt: [
          {
            $size: {
              $setIntersection: [{ $ifNull: ["$audience", ["unisex"]] }, a],
            },
          },
          0,
        ],
      };
    }
  }

  if (qs.specsJson) {
    try {
      const wanted = JSON.parse(qs.specsJson);
      const and: any[] = [];
      for (const [k, v] of Object.entries(wanted)) {
        and.push({ [`specs.${k}`]: v });
      }
      if (and.length) filter.$and = [...(filter.$and || []), ...and];
    } catch {
      // ignore bad JSON
    }
  }

  return filter;
}

/* ---------------- Compact mappers for lightweight APIs ---------------- */

export type CompactProduct = {
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string | null;
  category: string | null;
  inStock?: boolean;
  /** Convenience link for UI that expects /category/<category>/<slug> */
  href?: string;
};

function toCompact(p: Product): CompactProduct {
  const name = p.title || (p as any).name || p.slug || "Unnamed Product";
  const price =
    typeof p.price === "number"
      ? p.price
      : typeof p.unitPrice === "number"
      ? (p.unitPrice as number)
      : typeof p.salePrice === "number"
      ? (p.salePrice as number)
      : 0;

  const image =
    p.imageUrl && String(p.imageUrl).length
      ? String(p.imageUrl)
      : Array.isArray(p.images) && p.images.length
      ? String(p.images[0])
      : null;

  // prefer explicit category; tolerate legacy
  const category =
    (p.category as string | undefined) ??
    ((p as any).type as string | undefined) ??
    null;

  const href =
    category && p.slug ? `/category/${category}/${p.slug}` : undefined;

  return {
    slug: String(p.slug || ""), // ✅ ensure string
    name,
    price,
    salePrice:
      typeof p.salePrice === "number"
        ? p.salePrice
        : typeof (p as any).discountedPrice === "number"
        ? ((p as any).discountedPrice as number)
        : null,
    image,
    category,
    inStock: typeof p.inStock === "boolean" ? p.inStock : undefined,
    href,
  };
}

/** 🔍 Fast lookup by slugs, returning compact product objects for UI */
export async function getProductsBySlugs(
  slugs: string[]
): Promise<CompactProduct[]> {
  const cleaned = Array.from(
    new Set((slugs || []).map((s) => String(s || "").trim()).filter(Boolean))
  );
  if (!cleaned.length) return [];

  const col = await getProductsCollection();
  const docs = await col
    .find({ slug: { $in: cleaned } })
    .project({
      _id: 1,
      slug: 1,
      title: 1,
      name: 1,
      price: 1,
      unitPrice: 1,
      salePrice: 1,
      discountedPrice: 1,
      category: 1,
      type: 1, // legacy
      imageUrl: 1,
      images: 1,
      inStock: 1,
      department: 1,
      subCategory: 1,
    })
    .toArray();

  return docs.map(mapDbToProduct).map(toCompact);
}
