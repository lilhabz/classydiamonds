// lib/productAdapter.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { productsData as legacyA } from "@/data/productsData";
// If you have other legacy arrays, import and add them here:
// import { jewelryData as legacyB } from "@/data/jewelryData";

export type AdminProduct = {
  _id?: string; // DB id when present
  id?: string; // legacy id when present
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  category: string; // rings | earrings | bracelets | necklaces | watches | jewelry
  subcategory?: string | null;
  imageUrl?: string | null;
  source: "db" | "legacy";
  archived?: boolean;
  createdAt?: string;
};

function kebabCase(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeOne(p: any, source: "db" | "legacy"): AdminProduct {
  const name = p?.name ?? p?.title ?? "Untitled";
  const rawSlug =
    p?.slug ??
    kebabCase(
      `${name}-${p?._id ?? p?.id ?? (source === "legacy" ? "legacy" : "db")}`
    );
  const imageUrl =
    p?.image ??
    p?.imageUrl ??
    (Array.isArray(p?.images) ? p.images[0] : null) ??
    "/gray-placeholder.jpg";
  const category = p?.category ?? p?.department ?? "jewelry";

  return {
    _id: p?._id ? String(p._id) : undefined,
    id: p?.id ? String(p.id) : undefined,
    slug: rawSlug,
    name,
    price: typeof p?.price === "number" ? p.price : Number(p?.price ?? 0),
    salePrice: p?.salePrice ?? null,
    category,
    subcategory: p?.subcategory ?? p?.subCategory ?? null,
    imageUrl,
    source,
    archived: Boolean(p?.archived),
    createdAt: p?.createdAt ? new Date(p.createdAt).toISOString() : undefined,
  };
}

export async function getDbProducts(): Promise<AdminProduct[]> {
  const client = await clientPromise;
  const db = client.db();
  const docs = await db.collection("products").find({}).toArray();
  return docs.map((d) => normalizeOne(d, "db"));
}

export function getLegacyProducts(): AdminProduct[] {
  const merged = [...(legacyA ?? []) /*, ...(legacyB ?? [])*/];
  return merged.map((d) => normalizeOne(d, "legacy"));
}

export async function getAllMergedProducts(): Promise<AdminProduct[]> {
  const [dbItems, legacyItems] = await Promise.all([
    getDbProducts(),
    Promise.resolve(getLegacyProducts()),
  ]);

  // If a DB item & legacy item share a slug, keep the DB item (source of truth)
  const bySlug = new Map<string, AdminProduct>();
  for (const item of legacyItems) bySlug.set(item.slug, item);
  for (const item of dbItems) bySlug.set(item.slug, item); // overwrites legacy with db
  return Array.from(bySlug.values());
}

export async function createDbProduct(payload: Partial<AdminProduct>) {
  const client = await clientPromise;
  const db = client.db();
  const insert = {
    name: payload.name ?? "Untitled",
    slug: payload.slug ?? kebabCase(payload.name ?? "untitled"),
    price:
      typeof payload.price === "number"
        ? payload.price
        : Number(payload.price ?? 0),
    salePrice: payload.salePrice ?? null,
    category: payload.category ?? "jewelry",
    subcategory: payload.subcategory ?? null,
    imageUrl: payload.imageUrl ?? "/gray-placeholder.jpg",
    archived: Boolean(payload.archived),
    createdAt: new Date(),
  };
  const result = await db.collection("products").insertOne(insert);
  return { ...insert, _id: String(result.insertedId), source: "db" as const };
}

export async function getDbProductById(id: string) {
  const client = await clientPromise;
  const db = client.db();
  if (!ObjectId.isValid(id)) return null;
  const doc = await db
    .collection("products")
    .findOne({ _id: new ObjectId(id) });
  return doc ? normalizeOne(doc, "db") : null;
}

export async function updateDbProductById(
  id: string,
  patch: Partial<AdminProduct>
) {
  const client = await clientPromise;
  const db = client.db();
  if (!ObjectId.isValid(id)) return null;
  const update: any = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.price !== undefined) update.price = Number(patch.price);
  if (patch.salePrice !== undefined) update.salePrice = patch.salePrice;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.subcategory !== undefined)
    update.subcategory = patch.subcategory ?? null;
  if (patch.imageUrl !== undefined) update.imageUrl = patch.imageUrl;
  if (patch.archived !== undefined) update.archived = Boolean(patch.archived);

  const res = await db
    .collection("products")
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );
  return res.value ? normalizeOne(res.value, "db") : null;
}

export async function deleteDbProductById(id: string) {
  const client = await clientPromise;
  const db = client.db();
  if (!ObjectId.isValid(id)) return null;
  const res = await db
    .collection("products")
    .findOneAndDelete({ _id: new ObjectId(id) });
  return res.value ? normalizeOne(res.value, "db") : null;
}
