// lib/productAdapter.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { productsData as legacyA } from "@/data/productsData";
// If you have more legacy arrays, import and include them in getLegacyProducts()

export type AdminProduct = {
  _id?: string;
  id?: string; // legacy id if present
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  category: string;
  subcategory?: string | null; // normalized to "subcategory"
  imageUrl?: string | null;
  source: "db" | "legacy";
  archived?: boolean;
  createdAt?: string;
  department?: "jewelry" | "watch";
  specs?: Record<string, any>;
  audience?: string[];
};

function kebabCase(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function inferDepartment(doc: any): "jewelry" | "watch" {
  const d = String(doc?.department || "").toLowerCase();
  if (d === "watch") return "watch";
  const cat = String(doc?.category || "").toLowerCase();
  if (cat === "watch" || cat === "watches") return "watch";
  return "jewelry";
}

function pickImage(doc: any): string | null {
  if (doc?.imageUrl) return String(doc.imageUrl);
  if (Array.isArray(doc?.images) && doc.images.length)
    return String(doc.images[0]);
  if (doc?.image) return String(doc.image);
  return "/gray-placeholder.jpg";
}

function normalizeOne(p: any, source: "db" | "legacy"): AdminProduct {
  const name = p?.name ?? p?.title ?? "Untitled";
  const slug = p?.slug ?? kebabCase(`${name}-${p?._id ?? p?.id ?? source}`);
  const category = p?.category ?? p?.department ?? "jewelry";
  const subcategory = p?.subcategory ?? p?.subCategory ?? null;

  return {
    _id: p?._id ? String(p._id) : undefined,
    id: p?.id ? String(p.id) : undefined,
    slug,
    name,
    price:
      typeof p?.price === "number"
        ? p.price
        : Number(p?.price ?? p?.unitPrice ?? 0),
    salePrice: p?.salePrice ?? null,
    category,
    subcategory,
    imageUrl: pickImage(p),
    source,
    archived: Boolean(p?.archived),
    createdAt: p?.createdAt ? new Date(p.createdAt).toISOString() : undefined,
    department: inferDepartment(p),
    specs: p?.specs && typeof p.specs === "object" ? p.specs : undefined,
    audience: Array.isArray(p?.audience) ? p.audience : undefined,
  };
}

export async function getDbProducts(): Promise<AdminProduct[]> {
  const client = await clientPromise;
  const db = client.db();
  const docs = await db
    .collection("products")
    .find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();
  return docs.map((d) => normalizeOne(d, "db"));
}

export function getLegacyProducts(): AdminProduct[] {
  const merged = [...(legacyA ?? [])];
  return merged.map((d) => normalizeOne(d, "legacy"));
}

export async function getAllMergedProducts(): Promise<AdminProduct[]> {
  const [dbItems, legacyItems] = await Promise.all([
    getDbProducts(),
    Promise.resolve(getLegacyProducts()),
  ]);
  const bySlug = new Map<string, AdminProduct>();
  for (const item of legacyItems) bySlug.set(item.slug, item);
  for (const item of dbItems) bySlug.set(item.slug, item); // DB overwrites legacy
  return Array.from(bySlug.values());
}

export async function createDbProduct(payload: Partial<AdminProduct>) {
  const client = await clientPromise;
  const db = client.db();
  const doc = {
    name: payload.name ?? "Untitled",
    slug: payload.slug ?? kebabCase(payload.name ?? "untitled"),
    price: Number(payload.price ?? 0),
    salePrice: payload.salePrice ?? null,
    category: payload.category ?? "jewelry",
    subcategory: payload.subcategory ?? null,
    imageUrl: payload.imageUrl ?? "/gray-placeholder.jpg",
    archived: Boolean(payload.archived),
    createdAt: new Date(),
    department: inferDepartment({ category: payload.category }),
    specs: payload.specs ?? {},
    audience: payload.audience ?? ["unisex"],
  };
  const res = await db.collection("products").insertOne(doc);
  return normalizeOne({ ...doc, _id: res.insertedId }, "db");
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

  const set: any = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.slug !== undefined) set.slug = patch.slug;
  if (patch.price !== undefined) set.price = Number(patch.price);
  if (patch.salePrice !== undefined) set.salePrice = patch.salePrice;
  if (patch.category !== undefined) set.category = patch.category;
  if (patch.subcategory !== undefined)
    set.subcategory = patch.subcategory ?? null;
  if (patch.imageUrl !== undefined)
    set.imageUrl = patch.imageUrl ?? "/gray-placeholder.jpg";
  if (patch.archived !== undefined) set.archived = Boolean(patch.archived);
  if (patch.specs !== undefined) set.specs = patch.specs ?? {};
  if (patch.audience !== undefined) set.audience = patch.audience ?? ["unisex"];
  set.updatedAt = new Date();

  const res = await db
    .collection("products")
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: set },
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
