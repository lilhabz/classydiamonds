// lib/products.ts
import { MongoClient, Db, ObjectId } from "mongodb";
import type { Product } from "@/types/product";

let _client: MongoClient | null = null;
let _db: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error("Missing env MONGODB_URI");
}

// Prefer explicit DB name, otherwise derive from the URI path (e.g. .../classydiamonds?...).
function parseDbNameFromUri(uri: string): string | null {
  try {
    const m = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
    return m?.[1] || null;
  } catch {
    return null;
  }
}
const DB_NAME =
  (process.env.MONGODB_DB as string | undefined) ||
  parseDbNameFromUri(MONGODB_URI) ||
  "classydiamonds";

export async function getDb(): Promise<Db> {
  if (_db) return _db;
  if (!_client) {
    _client = new MongoClient(MONGODB_URI);
    await _client.connect();
  }
  _db = _client.db(DB_NAME);
  return _db;
}

/** ----- Legacy normalization helpers ----- */
function inferDepartment(doc: any): "jewelry" | "watch" {
  const d = String(doc?.department || "").toLowerCase();
  if (d === "watch") return "watch";
  const cat = String(doc?.category || "").toLowerCase();
  if (cat === "watch" || cat === "watches") return "watch";
  return "jewelry";
}
function firstImage(doc: any): string {
  if (doc?.imageUrl) return String(doc.imageUrl);
  if (Array.isArray(doc?.images) && doc.images.length) return String(doc.images[0]);
  if (doc?.image) return String(doc.image);
  return "";
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
    audience: Array.isArray(doc.audience) && doc.audience.length ? doc.audience : ["unisex"],
    price: doc.price ?? doc.unitPrice,
    originalPrice: doc.originalPrice,
    salePrice: doc.salePrice,
    discountedPrice: doc.discountedPrice,
    unitPrice: doc.unitPrice ?? doc.price,
    imageUrl: firstImage(doc),
    images: Array.isArray(doc.images) ? doc.images : (firstImage(doc) ? [firstImage(doc)] : []),
    description: doc.description ?? "",
    // tags intentionally omitted (legacy tolerated in DB, not in type)
    specs: (doc.specs && typeof doc.specs === "object") ? doc.specs : undefined,
    featured: typeof doc.featured === "boolean" ? doc.featured : undefined,
    skuNumber: typeof doc.skuNumber === "number" ? doc.skuNumber : undefined,
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

  // remove undefined to avoid overwriting with undefined
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);

  return out;
}

/** ------------ Queries & CRUD ------------- */
type ListOptions = {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
};

export async function listProducts(filter: any = {}, options: ListOptions = {}) {
  const db = await getDb();
  const cursor = db.collection("products")
    .find(filter)
    .sort(options.sort ?? { createdAt: -1 })
    .limit(options.limit ?? 1000)
    .skip(options.skip ?? 0);

  const rows = await cursor.toArray();
  return rows.map(mapDbToProduct);
}

export async function getProductById(id: string) {
  const db = await getDb();
  const _id = new ObjectId(id);
  const doc = await db.collection("products").findOne({ _id });
  return doc ? mapDbToProduct(doc) : null;
}

/** Allow legacy payloads to contain `tags` but drop them before insert */
type LegacyCreate = Omit<Product, "_id"> & { tags?: string[] };

export async function createProduct(input: LegacyCreate) {
  const db = await getDb();
  const { tags: _legacyTags, ...clean } = input; // strip tags
  const now = new Date();

  const toInsert = normalizeForWrite({
    ...clean,
    createdAt: now,
    updatedAt: now,
  });

  const result = await db.collection("products").insertOne(toInsert);
  const saved = await db.collection("products").findOne({ _id: result.insertedId });
  return saved ? mapDbToProduct(saved) : null;
}

/** Drop legacy `tags` in patch; keep imageUrl/images in sync */
type LegacyPatch = Partial<Product> & { tags?: string[] };

export async function updateProduct(id: string, patch: LegacyPatch) {
  const db = await getDb();
  const _id = new ObjectId(id);

  const { tags: _legacyTags, ...clean } = patch; // strip tags
  const updateSet = normalizeForWrite({
    ...clean,
    updatedAt: new Date(),
  });

  if (Object.keys(updateSet).length === 0) {
    const fresh = await db.collection("products").findOne({ _id });
    return fresh ? mapDbToProduct(fresh) : null;
  }

  await db.collection("products").updateOne({ _id }, { $set: updateSet });
  const saved = await db.collection("products").findOne({ _id });
  return saved ? mapDbToProduct(saved) : null;
}

export async function deleteProduct(id: string) {
  const db = await getDb();
  const _id = new ObjectId(id);
  await db.collection("products").deleteOne({ _id });
  return { ok: true };
}

/** ---------- Optional: query helpers compatible with your API ---------- */
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
