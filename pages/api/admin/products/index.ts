// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/products";

// ----- Types your table already expects -----
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
  collection: string;
};
type Err = { ok: false; error: string };

const s = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: any) => {
  if (v == null || v === "") return undefined;
  const num =
    typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(num) ? num : undefined;
};
const toId = (x: any) =>
  typeof x === "string" ? x : x?.toString?.() ?? undefined;

// IMPORTANT: honor your env-based collection selector
const catalogCollectionName =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

// Build a simple `$or` regex filter for q
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

  const cat = s(doc?.category);
  const dept =
    s(doc?.department).toLowerCase() === "watch" ||
    ["watch", "watches"].includes(cat.toLowerCase())
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
    category: cat || undefined,
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
    department: dept as any,
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
    "";
  const sub =
    s(doc?.subCategory) || s(doc?.subcategory) || s(doc?.subcatagory) || "";
  const audience = Array.isArray(doc?.audience)
    ? doc.audience.map(String)
    : doc?.audience
    ? [String(doc.audience)]
    : ["unisex"];

  const dept =
    s(doc?.department).toLowerCase() === "watch" ||
    ["watch", "watches"].includes(cat.toLowerCase())
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
    category: cat || undefined,
    subCategory: sub || undefined,
    subcategory: sub || undefined,
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
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  // Admin gate
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const db = await getDb();

  // query params
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const includeLegacy =
    String(req.query.includeLegacy ?? "1").toLowerCase() !== "0" &&
    String(req.query.includeLegacy ?? "1").toLowerCase() !== "false";
  const curFilter = buildFilter(q);
  const legFilter = buildFilter(q);

  // ✅ Use the resolved catalog collection name
  const productsCol = db.collection(catalogCollectionName);
  const currentDocs = await productsCol.find(curFilter).toArray();
  const current = currentDocs.map(adaptDb);

  // legacy (optional)
  let legacy: AdminProduct[] = [];
  if (includeLegacy) {
    try {
      const legacyDocs = await db
        .collection("legacyProducts")
        .find(legFilter)
        .toArray();
      legacy = legacyDocs.map(adaptLegacy);
    } catch {
      legacy = [];
    }
  }

  const items = [...current, ...legacy].sort((a, b) => {
    // new first
    if ((a.source === "legacy") !== (b.source === "legacy")) {
      return a.source === "legacy" ? 1 : -1;
    }
    // then newest createdAt
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  return res.status(200).json({
    ok: true,
    items,
    counts: { new: current.length, legacy: legacy.length },
    collection: catalogCollectionName,
  });
}
