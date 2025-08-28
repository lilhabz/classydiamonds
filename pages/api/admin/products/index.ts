// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/products";

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
};

type Ok = {
  ok: true;
  items: AdminProduct[];
  counts?: { new: number; legacy: number };
};
type Err = { ok: false; error: string };

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function n(v: any) {
  if (v == null || v === "") return undefined;
  const num =
    typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(num) ? num : undefined;
}
function toId(x: any) {
  if (!x) return undefined;
  if (typeof x === "string") return x;
  if (typeof x === "object" && typeof x.toString === "function")
    return x.toString();
  return String(x);
}

function adaptDb(doc: any): AdminProduct {
  const id = toId(doc?._id);
  const name = s(doc?.name) || undefined;
  const price = n(doc?.price);
  const salePrice = doc?.salePrice == null ? null : n(doc?.salePrice) ?? null;
  const image = s(doc?.image) || s(doc?.imageUrl) || null;
  const images = Array.isArray(doc?.images) ? doc.images.map(String) : null;
  const audience = Array.isArray(doc?.audience)
    ? doc.audience.map(String)
    : doc?.audience
    ? [String(doc.audience)]
    : ["unisex"];

  return {
    _id: id,
    slug: s(doc?.slug) || id || "",
    name,
    title: name,
    description: s(doc?.description) || undefined,
    price: price,
    unitPrice: price,
    salePrice,
    category: s(doc?.category) || undefined,
    subCategory: s(doc?.subCategory) || undefined,
    subcategory: s(doc?.subCategory) || undefined,
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
    department:
      s(doc?.department).toLowerCase() === "watch" ||
      s(doc?.category).toLowerCase() === "watch" ||
      s(doc?.category).toLowerCase() === "watches"
        ? "watch"
        : "jewelry",
    skuNumber: typeof doc?.skuNumber === "number" ? doc.skuNumber : undefined,
  };
}

function adaptLegacy(doc: any): AdminProduct {
  const id = toId(doc?._id);
  const name =
    s(doc?.name) || s(doc?.title) || s(doc?.productName) || "Untitled (legacy)";
  const price = n(doc?.unitPrice ?? doc?.price);
  const img = s(doc?.image) || s(doc?.img) || s(doc?.imageUrl) || null;
  const cat =
    s(doc?.category) ||
    s(doc?.catagory) ||
    s(doc?.cat) ||
    s(doc?.rings) ||
    s(doc?.bracelets) ||
    s(doc?.necklaces) ||
    s(doc?.earrings) ||
    undefined;
  const sub =
    s(doc?.subCategory) ||
    s(doc?.subcategory) ||
    s(doc?.subcatagory) ||
    undefined;
  const audience = Array.isArray(doc?.audience)
    ? doc.audience.map(String)
    : doc?.audience
    ? [String(doc.audience)]
    : ["unisex"];

  return {
    id, // legacy might not have a proper _id string for your UI; keep both
    slug: s(doc?.slug) || id || "",
    name,
    title: name,
    description: s(doc?.description) || undefined,
    price: price,
    unitPrice: price,
    salePrice: n(doc?.salePrice) ?? null,
    category: cat,
    subCategory: sub,
    subcategory: sub,
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
    department:
      s(doc?.department).toLowerCase() === "watch" ||
      s(cat).toLowerCase() === "watch" ||
      s(cat).toLowerCase() === "watches"
        ? "watch"
        : "jewelry",
    skuNumber: typeof doc?.skuNumber === "number" ? doc.skuNumber : undefined,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  // admin-only
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const db = await getDb();
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const rx = q
    ? { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
    : null;

  // 1) current DB products
  const curFilter = rx
    ? {
        $or: [
          { name: rx },
          { slug: rx },
          { description: rx },
          { category: rx },
          { subCategory: rx },
        ],
      }
    : {};
  const currentDocs = await db.collection("products").find(curFilter).toArray();
  const current = currentDocs.map(adaptDb);

  // 2) legacy products (if collection exists)
  let legacy: AdminProduct[] = [];
  try {
    const legFilter = rx
      ? {
          $or: [
            { name: rx },
            { title: rx },
            { productName: rx },
            { slug: rx },
            { category: rx },
            { subCategory: rx },
            { subcategory: rx },
          ],
        }
      : {};
    const legacyDocs = await db
      .collection("legacyProducts")
      .find(legFilter)
      .toArray();
    legacy = legacyDocs.map(adaptLegacy);
  } catch {
    legacy = [];
  }

  // Combine; new first then legacy; latest createdAt first
  const items = [...current, ...legacy].sort((a, b) => {
    if ((a.source === "legacy") !== (b.source === "legacy")) {
      return a.source === "legacy" ? 1 : -1;
    }
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  return res.status(200).json({
    ok: true,
    items,
    counts: { new: current.length, legacy: legacy.length },
  });
}
