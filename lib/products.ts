// lib/products.ts
import clientPromise from "@/lib/mongodb";
import {
  ObjectId,
  type WithId,
  type Document,
  type OptionalUnlessRequiredId,
} from "mongodb";
import type { Product, Audience, Department } from "@/types/product";
import { DEPARTMENTS } from "@/lib/taxonomy";

/** Robust number parse */
const toNumber = (v: unknown, d = 0): number => {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : d;
  }
  return d;
};

export async function getDb() {
  const client = await clientPromise;
  return client.db();
}

/** DB representation: _id is ObjectId */
type DbProduct = Omit<Product, "_id"> & { _id: ObjectId };

/** Convert DB doc -> API Product (string _id), with legacy fallbacks */
function fromDb(doc: WithId<Document> | DbProduct): Product {
  const anyDoc = doc as any;

  // title/image legacy
  const title = anyDoc.title ?? anyDoc.name ?? "";
  const images: string[] = Array.isArray(anyDoc.images)
    ? anyDoc.images
    : (anyDoc.image ? [String(anyDoc.image)] : []);

  // department legacy: old `category` field may have been "jewelry" | "watch"
  let department: Department = "jewelry";
  if (DEPARTMENTS.includes((anyDoc.department || anyDoc.category)?.toLowerCase())) {
    department = (anyDoc.department || anyDoc.category).toLowerCase();
  } else if (anyDoc.department) {
    department = anyDoc.department;
  }

  // if category was used as dept, move detailed category into `category` (may be empty)
  const category =
    !DEPARTMENTS.includes((anyDoc.category || "").toLowerCase()) ? anyDoc.category : anyDoc.category2 || anyDoc.cat || anyDoc.type;

  const out: Product = {
    _id: String(anyDoc._id),
    title: String(title),
    slug: anyDoc.slug ? String(anyDoc.slug) : undefined,
    department,
    category: category ? String(category) : undefined,
    subCategory: anyDoc.subCategory ? String(anyDoc.subCategory) : undefined,
    audience:
      Array.isArray(anyDoc.audience) && anyDoc.audience.length > 0
        ? anyDoc.audience
        : ["unisex"],
    price: anyDoc.price,
    originalPrice: anyDoc.originalPrice,
    salePrice: anyDoc.salePrice,
    discountedPrice: anyDoc.discountedPrice,
    unitPrice: anyDoc.unitPrice,
    images,
    description: anyDoc.description ? String(anyDoc.description) : "",
    tags: Array.isArray(anyDoc.tags) ? anyDoc.tags : [],
    specs: (anyDoc.specs && typeof anyDoc.specs === "object") ? anyDoc.specs : undefined,
    createdAt: anyDoc.createdAt ? String(anyDoc.createdAt) : undefined,
    updatedAt: anyDoc.updatedAt ? String(anyDoc.updatedAt) : undefined,
  };
  return out;
}

/** Normalize incoming payload (no _id) before insert/update */
function normalizeProductInput(p: Partial<Product>): Omit<Product, "_id"> {
  const now = new Date().toISOString();

  const images = Array.isArray(p.images)
    ? p.images.filter((u: unknown): u is string => typeof u === "string" && u.trim() !== "")
    : [];

  const audience: Audience[] =
    Array.isArray(p.audience) && p.audience.length > 0
      ? (Array.from(new Set(p.audience)) as Audience[])
      : ["unisex"];

  const department = (p.department || "jewelry") as Product["department"];
  const category = (p.category || "").toString() || undefined;
  const subCategory = (p.subCategory || "").toString() || undefined;

  const unit =
    toNumber(p.unitPrice) ||
    toNumber(p.salePrice) ||
    toNumber(p.discountedPrice) ||
    toNumber(p.originalPrice) ||
    toNumber(p.price);

  const specs = (p.specs && typeof p.specs === "object") ? p.specs : undefined;

  const out: Omit<Product, "_id"> = {
    title: (p.title || "").toString(),
    slug: (p.slug || "").toString().trim() || undefined,
    department,
    category,
    subCategory,
    audience,
    unitPrice: unit,
    price: p.price ?? unit,
    originalPrice: p.originalPrice ?? undefined,
    salePrice: p.salePrice ?? undefined,
    discountedPrice: p.discountedPrice ?? undefined,
    images,
    description: (p.description || "").toString(),
    tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
    specs,
    createdAt: (p as any).createdAt || now,
    updatedAt: now,
  };

  return out;
}

export async function listProducts(
  filter: any = {},
  options: { limit?: number; skip?: number; sort?: any } = {}
) {
  const db = await getDb();
  const Products = db.collection<DbProduct>("products");

  // Ensure audience default at read time
  const audienceFix = {
    $addFields: {
      audience: {
        $cond: [
          { $gt: [{ $size: { $ifNull: ["$audience", []] } }, 0] },
          "$audience",
          ["unisex"],
        ],
      },
    },
  };

  const pipeline: any[] = [audienceFix, { $match: filter }];
  if (options.sort) pipeline.push({ $sort: options.sort });
  if (options.skip) pipeline.push({ $skip: options.skip });
  if (options.limit) pipeline.push({ $limit: options.limit });

  const docs = await Products.aggregate(pipeline).toArray();
  return docs.map((d) => fromDb(d as any));
}

export async function getProductById(id: string) {
  const db = await getDb();
  const Products = db.collection<DbProduct>("products");
  const doc = await Products.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;

  if (!doc.audience || !Array.isArray(doc.audience) || doc.audience.length === 0) {
    (doc as any).audience = ["unisex"];
  }

  return fromDb(doc);
}

export async function createProduct(p: Partial<Product>) {
  const db = await getDb();
  const Products = db.collection<DbProduct>("products");

  const toInsert: OptionalUnlessRequiredId<DbProduct> = {
    ...(normalizeProductInput(p) as Omit<DbProduct, "_id">),
  } as any;

  const result = await Products.insertOne(toInsert);
  const insertedDoc: DbProduct = {
    ...(toInsert as any),
    _id: result.insertedId,
  };
  return fromDb(insertedDoc);
}

export async function updateProduct(id: string, p: Partial<Product>) {
  const db = await getDb();
  const Products = db.collection<DbProduct>("products");

  const existing = await Products.findOne({ _id: new ObjectId(id) });
  if (!existing) return null;

  const { _id: _ignore, ...existingNoId } = existing as any;

  const normalized = normalizeProductInput({ ...existingNoId, ...p });
  const merged: DbProduct = {
    ...existing,
    ...normalized,
    _id: existing._id,
    updatedAt: new Date().toISOString(),
  };

  const { _id, ...$set } = merged as any;
  await Products.updateOne({ _id: existing._id }, { $set });

  return fromDb(merged);
}

export async function deleteProduct(id: string) {
  const db = await getDb();
  const Products = db.collection<DbProduct>("products");
  const res = await Products.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}
