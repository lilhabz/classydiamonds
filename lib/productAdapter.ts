// lib/productAdapter.ts
export type Audience = "him" | "her";

/** Canonical product shape used across admin + UI */
export type CanonicalAdminProduct = {
  _id: string;
  name: string;
  slug?: string | null;
  category?: string | null;
  subCategory?: string | null;
  /** ✅ Unified array schema (replaces old string "unisex" | "for-him" | "for-her") */
  audience?: Audience[] | null;
  price?: number | null;
  salePrice?: number | null;
  image?: string | null; // keep whatever your UI expects
  imageUrl?: string | null; // some docs use imageUrl
  department?: string | null; // some older docs used department
  isLegacy: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;

  /** 🆕 Stock flag (default true if missing) */
  inStock?: boolean | null;
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
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && typeof raw.toString === "function")
    return raw.toString();
  return String(raw);
}

/** Map any audience-ish token to "him" | "her" | null */
function mapTokenToAudience(token?: string | null): Audience | null {
  const t = token?.toLowerCase().trim();
  if (!t) return null;
  if (t === "him" || t === "male" || t === "men" || t === "for-him")
    return "him";
  if (t === "her" || t === "female" || t === "women" || t === "for-her")
    return "her";
  return null;
}

/** Normalize a document's audience/gender fields to our array schema. */
function normalizeAudience(doc: any): Audience[] | null {
  // 1) If doc has array-like audience already
  if (Array.isArray(doc?.audience)) {
    const set = new Set<Audience>();
    for (const x of doc.audience) {
      const mapped = mapTokenToAudience(String(x));
      if (mapped) set.add(mapped);
      // treat unisex markers inside arrays as full audience
      if (
        String(x).toLowerCase() === "unisex" ||
        String(x).toLowerCase() === "all" ||
        String(x).toLowerCase() === "any"
      ) {
        set.add("him");
        set.add("her");
      }
    }
    if (set.size === 0) return ["him", "her"]; // fallback to unisex
    return Array.from(set);
  }

  // 2) If doc has a single audience string
  if (typeof doc?.audience === "string") {
    const a = doc.audience.toLowerCase().trim();
    if (a === "unisex" || a === "all" || a === "any") return ["him", "her"];
    const mapped = mapTokenToAudience(a);
    return mapped ? [mapped] : ["him", "her"]; // default to unisex if unknown
  }

  // 3) Legacy gender support
  if (Array.isArray(doc?.gender)) {
    const set = new Set<Audience>();
    for (const g of doc.gender) {
      const m = mapTokenToAudience(String(g));
      if (m) set.add(m);
    }
    if (set.size === 0) return ["him", "her"];
    return Array.from(set);
  }
  if (typeof doc?.gender === "string") {
    const m = mapTokenToAudience(doc.gender);
    return m ? [m] : ["him", "her"];
  }

  // 4) No hints → treat as unisex
  return ["him", "her"];
}

/** Heuristics: decide if a doc "looks" legacy. */
function looksLegacy(doc: any): boolean {
  // obvious legacy clues
  if (doc?.isLegacy === true) return true;
  // odd keys often present in older sets, or only having 'gender' not 'audience'
  const hasLegacyCatTypos = !!(doc?.catagory || doc?.subcatagory);
  const hasGenderOnly = !!doc?.gender && !doc?.audience;
  const legacyNameKeys = !!(doc?.Name || doc?.productName || doc?.title);
  return hasLegacyCatTypos || hasGenderOnly || legacyNameKeys;
}

/** Adapter for *legacy* docs with odd keys */
export function adaptLegacyProduct(doc: any): CanonicalAdminProduct {
  // Try a few common legacy field names
  const name =
    s(doc?.name) ||
    s(doc?.title) ||
    s(doc?.productName) ||
    s(doc?.Name) ||
    "Untitled (legacy)";

  // Legacy might have typos/short keys for category
  const category =
    s(doc?.category) ||
    s(doc?.catagory) ||
    s(doc?.cat) ||
    s(doc?.rings) ||
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
    name,
    slug: s(doc?.slug) || null,
    category,
    subCategory,
    audience: normalizeAudience(doc), // ✅ array form
    price,
    salePrice,
    image,
    imageUrl: s(doc?.imageUrl) || image,
    department: s(doc?.department) || category,
    isLegacy: true,
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
    inStock: doc?.inStock !== false, // default true for legacy
  };
}

/** Adapter for *new/current* docs (ensure the shape is consistent) */
export function adaptNewProduct(doc: any): CanonicalAdminProduct {
  return {
    _id: idStr(doc),
    name: s(doc?.name) || "Untitled",
    slug: s(doc?.slug) || null,
    category: s(doc?.category) || s(doc?.department) || null,
    subCategory: s(doc?.subCategory) || s(doc?.subcategory) || null,
    audience: normalizeAudience(doc), // ✅ array form
    price: n(doc?.price),
    salePrice: n(doc?.salePrice),
    image: s(doc?.image) || s(doc?.imageUrl) || null,
    imageUrl: s(doc?.imageUrl) || s(doc?.image) || null,
    department: s(doc?.department) || null,
    isLegacy: false,
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
    inStock: doc?.inStock !== false, // default true if missing
  };
}

/** Convenience: choose legacy vs new automatically */
export function adaptProduct(doc: any): CanonicalAdminProduct {
  return looksLegacy(doc) ? adaptLegacyProduct(doc) : adaptNewProduct(doc);
}
