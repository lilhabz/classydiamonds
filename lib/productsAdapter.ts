import type { WithId, Document } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { productsData as legacyProducts } from "@/data/productsData"; // keep import name stable

const DB_NAME = process.env.MONGODB_DB!;
const COLL = process.env.PRODUCTS_COLLECTION || "products";

export type Product = {
  _id?: string;

  name: string;
  slug?: string;
  price: number;
  salePrice?: number | null;
  category: string;
  subCategory?: string | null;

  image?: string | null;
  imageUrl?: string | null;
  images?: string[];
  audience?: string[];
  specs?: Record<string, unknown>;

  /** 🆕 Stock flag (default true) */
  inStock: boolean;
};

export async function getAllProductsMerged(): Promise<Product[]> {
  if (!DB_NAME) {
    throw new Error("MONGODB_DB env var is required");
  }
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const coll = db.collection(COLL);
  const mongoDocs = (await coll.find({}).toArray()) as WithId<Document>[];

  // Normalize Mongo docs → Product
  const mongoNormalized: Product[] = mongoDocs.map((d) => {
    const _id = String(d._id);
    const image =
      (d.images?.[0] as string) ??
      (d.image as string) ??
      (d.imageUrl as string) ??
      null;
    return {
      _id,
      name: (d.name as string) ?? (d.title as string),
      slug: d.slug as string | undefined,
      price: Number(d.price ?? 0),
      salePrice: d.salePrice != null ? Number(d.salePrice) : null,
      category: (d.category as string) ?? "uncategorized",
      subCategory: (d.subCategory as string) ?? null,
      image,
      imageUrl: (d.imageUrl as string) ?? null,
      audience: (d.audience as string[]) ?? undefined,
      specs: (d.specs as Record<string, unknown>) ?? undefined,
      images: (d.images as string[]) ?? undefined,

      // 🆕 Ensure boolean; default to true
      inStock: typeof d.inStock === "boolean" ? d.inStock : true,
    };
  });

  // Normalize legacy → Product (read-only)
  const legacyNormalized: Product[] = (legacyProducts as any[]).map((p) => {
    const image = p.image ?? p.imageUrl ?? p.images?.[0] ?? null;
    return {
      name: p.name ?? p.title,
      slug: p.slug,
      price: Number(p.price ?? 0),
      salePrice: p.salePrice != null ? Number(p.salePrice) : null,
      category: p.category ?? "uncategorized",
      subCategory: p.subCategory ?? null,
      image,
      imageUrl: p.imageUrl ?? null,
      audience: p.audience,
      specs: p.specs,
      images: p.images,

      // 🆕 Legacy products are assumed in stock
      inStock: true,
    };
  });

  // Return Mongo first (source of truth), then legacy (read-only)
  return [...mongoNormalized, ...legacyNormalized];
}
