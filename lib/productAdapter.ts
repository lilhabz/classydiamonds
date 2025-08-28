// lib/productAdapter.ts
export type CanonicalAdminProduct = {
  _id: string;
  name: string;
  slug?: string | null;
  category?: string | null;
  subCategory?: string | null;
  audience?: string | null; // e.g. "unisex", "for-him", "for-her"
  price?: number | null;
  salePrice?: number | null;
  image?: string | null; // keep whatever your UI expects
  imageUrl?: string | null; // some docs use imageUrl
  department?: string | null; // some older docs used department
  isLegacy: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  // add anything else your UI needs (sku, availability, etc.)
};

/** Safe string getter */
function s(v: any): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
/** Safe number getter */
function n(v: any): number | null {
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : null;
}

/** Normalize _id to string */
function idStr(doc: any): string {
  const raw = doc?._id;
  // Mongo ObjectId or string:
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && typeof raw.toString === "function")
    return raw.toString();
  return String(raw);
}

/** Adapter for *legacy* docs with odd keys (e.g. 'acelet', 'cklace', etc.) */
export function adaptLegacyProduct(doc: any): CanonicalAdminProduct {
  // Try a few common legacy field names
  const name =
    s(doc?.name) ||
    s(doc?.title) ||
    s(doc?.productName) ||
    s(doc?.Name) ||
    null;

  // Legacy might have typos/short keys for category
  const category =
    s(doc?.category) ||
    s(doc?.catagory) ||
    s(doc?.cat) ||
    s(doc?.rings) || // sometimes the category name was stored as a key
    s(doc?.bracelets) ||
    s(doc?.necklaces) ||
    s(doc?.earrings) ||
    null;

  const subCategory =
    s(doc?.subCategory) || s(doc?.subcategory) || s(doc?.subcatagory) || null;

  const image = s(doc?.image) || s(doc?.img) || s(doc?.imageUrl) || null;

  const price = n(doc?.price);
  const salePrice = n(doc?.salePrice);

  return {
    _id: idStr(doc),
    name: name || "Untitled (legacy)",
    slug: s(doc?.slug) || null,
    category,
    subCategory,
    audience: s(doc?.audience) || s(doc?.gender) || "unisex",
    price,
    salePrice,
    image,
    imageUrl: s(doc?.imageUrl) || image,
    department: s(doc?.department) || category,
    isLegacy: true,
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
  };
}

/** Adapter for *new/current* docs (ensure the shape is consistent) */
export function adaptNewProduct(doc: any): CanonicalAdminProduct {
  return {
    _id: idStr(doc),
    name: s(doc?.name) || "Untitled",
    slug: s(doc?.slug) || null,
    category: s(doc?.category) || s(doc?.department) || null,
    subCategory: s(doc?.subCategory) || null,
    audience: s(doc?.audience) || "unisex",
    price: n(doc?.price),
    salePrice: n(doc?.salePrice),
    image: s(doc?.image) || s(doc?.imageUrl) || null,
    imageUrl: s(doc?.imageUrl) || s(doc?.image) || null,
    department: s(doc?.department) || null,
    isLegacy: false,
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
  };
}
