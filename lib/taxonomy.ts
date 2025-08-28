// lib/taxonomy.ts
import type { Department } from "@/types/product";

/**
 * Authoritative taxonomy + helpers
 * - Admin-side category set (separate from storefront's data/taxonomy.ts)
 * - Spec keys/option slugs align with FiltersSidebar (metal/stone/shape)
 */

export const DEPARTMENTS: Department[] = ["jewelry", "watch"];

/** Top-level categories per department (admin) */
export const CATEGORIES: Record<Department, string[]> = {
  jewelry: ["ring", "earring", "bracelet", "necklace-pendant"],
  watch: ["watch", "strap", "accessory"], // placeholder for future
};

/** Subcategories per (dept:category) */
export const SUBCATEGORIES: Record<string, string[]> = {
  // RINGS
  "jewelry:ring": [
    "engagement",
    "wedding",
    "promise",
    "eternity",
    "birthstone",
    "signet",
    "mens",
  ],
  // EARRINGS
  "jewelry:earring": ["studs", "hoops", "drops", "huggies", "climbers"],
  // BRACELETS
  "jewelry:bracelet": ["tennis", "bangle", "chain", "cuff"],
  // NECKLACES & PENDANTS — no subs yet
  "jewelry:necklace-pendant": [],

  // Watches (placeholders)
  "watch:watch": [],
  "watch:strap": [],
  "watch:accessory": [],
};

/** ---------- Specs (filters) config ---------- */
/**
 * BASE_SPECS defines all available fields.
 * SPEC_CONFIG picks which to show per (dept:cat[:sub]?).
 * All fields are optional; blank = not stored.
 */
type SpecField =
  | { type: "select"; options: string[]; label?: string }
  | { type: "number"; unit?: string; step?: number; label?: string }
  | { type: "text"; label?: string }
  | { type: "boolean"; label?: string };

/** IMPORTANT: Keep these slugs in sync with FiltersSidebar */
const METAL_OPTIONS = ["yellow-gold", "white-gold", "rose-gold", "platinum"] as const;
const STONE_OPTIONS = ["diamond", "lab-grown", "moissanite", "gemstone"] as const;
const SHAPE_OPTIONS = ["round", "oval", "princess", "emerald", "cushion", "pear"] as const;

export const BASE_SPECS: Record<string, SpecField> = {
  // Match FiltersSidebar facets exactly:
  metal: { type: "select", options: [...METAL_OPTIONS] },
  stone: { type: "select", options: [...STONE_OPTIONS] },
  shape: { type: "select", options: [...SHAPE_OPTIONS] },

  // Additional detail (optional)
  karat: { type: "select", options: ["10k", "14k", "18k", "22k", "24k"] },
  carat: { type: "number", unit: "ct", step: 0.01, label: "Carat (total/primary)" },
  size: { type: "text", label: "Size (ring) / Length label" },
  length: { type: "number", unit: "in", step: 0.5, label: "Length" },
  width: { type: "number", unit: "mm", step: 0.1, label: "Width" },

  // Diamond-ish grading (slugs normalized to lowercase)
  color: { type: "text", label: "Color" },
  clarity: {
    type: "select",
    options: ["fl", "if", "vvs1", "vvs2", "vs1", "vs2", "si1", "si2", "i1", "i2", "i3"],
  },

  custom: { type: "boolean", label: "Custom work" },
};

/** Which spec fields to show by (dept:category[:sub]?) */
export const SPEC_CONFIG: Record<string, (keyof typeof BASE_SPECS)[]> = {
  // Jewelry
  "jewelry:ring": ["metal", "karat", "stone", "carat", "clarity", "shape", "size", "custom"],
  "jewelry:earring": ["metal", "karat", "stone", "carat", "shape", "custom"],
  "jewelry:bracelet": ["metal", "karat", "stone", "carat", "length", "width", "custom"],
  "jewelry:necklace-pendant": ["metal", "karat", "stone", "carat", "length", "custom"],

  // Watch (basic placeholders)
  "watch:watch": ["metal", "color", "custom"],
  "watch:strap": ["metal", "color", "length", "width"],
  "watch:accessory": ["color"],
};

/** ---------- Helpers exported & used by UI/API ---------- */

export function keyFor(dept?: string, cat?: string, sub?: string) {
  const d = (dept || "").toLowerCase();
  const c = (cat || "").toLowerCase();
  const s = (sub || "").toLowerCase();
  return s ? `${d}:${c}:${s}` : `${d}:${c}`;
}

export function getCategories(dept?: string): string[] {
  if (!dept) return [];
  return CATEGORIES[dept as Department] || [];
}

export function getSubCategories(dept?: string, cat?: string): string[] {
  if (!dept || !cat) return [];
  return SUBCATEGORIES[`${dept}:${cat}`] || [];
}

/** Return the spec fields (key + field definition) for a given (dept, cat, sub) */
export function getSpecFields(
  dept?: string,
  cat?: string,
  sub?: string
): [string, SpecField][] {
  if (!dept || !cat) return [];
  const baseKey = `${dept}:${cat}`;
  const subKey = sub ? `${dept}:${cat}:${sub}` : "";
  const keys = (subKey && SPEC_CONFIG[subKey]) || SPEC_CONFIG[baseKey] || [];
  return keys.map((k) => [k, BASE_SPECS[k]]);
}

/** ---------- Category/subcategory normalization for jewelry ---------- */
/**
 * Many legacy docs have a subcategory stored in `category` (e.g., "engagement", "studs").
 * This function moves it into `subCategory` and infers the correct parent category.
 */
const JEWELRY_SUB_TO_PARENT: Record<
  string,
  "ring" | "earring" | "bracelet" | "necklace-pendant"
> = (() => {
  const map: Record<string, any> = {};
  const add = (sub: string, parent: any, variants: string[] = []) => {
    map[sub] = parent;
    variants.forEach((v) => (map[v] = parent));
  };

  // rings
  ["engagement", "wedding", "promise", "eternity", "birthstone", "signet", "mens"].forEach((s) =>
    add(s, "ring")
  );

  // earrings (singular/plural)
  add("studs", "earring", ["stud"]);
  add("hoops", "earring", ["hoop"]);
  add("drops", "earring", ["drop"]);
  add("huggies", "earring", ["huggie"]);
  add("climbers", "earring", ["climber"]);

  // bracelets
  ["tennis", "bangle", "chain", "cuff"].forEach((s) => add(s, "bracelet"));

  // (no subs yet for necklace-pendant)
  return map as Record<string, "ring" | "earring" | "bracelet" | "necklace-pendant">;
})();

export function normalizeJewelryCategoryPair(
  category?: string,
  subCategory?: string
): { category?: string; subCategory?: string } {
  const cat = (category || "").toLowerCase().trim();
  const sub = (subCategory || "").toLowerCase().trim();

  const isValidCategory = CATEGORIES.jewelry.includes(cat as any);
  const isValidSubForCat =
    isValidCategory && getSubCategories("jewelry", cat).includes(sub);

  // already correct
  if (isValidCategory && (sub === "" || isValidSubForCat)) {
    return { category: cat || undefined, subCategory: sub || undefined };
  }

  // category is actually a known subcategory → promote parent
  if (cat && JEWELRY_SUB_TO_PARENT[cat]) {
    const parent = JEWELRY_SUB_TO_PARENT[cat];
    if (!sub) {
      return { category: parent, subCategory: cat };
    }
    const validUnderParent = getSubCategories("jewelry", parent).includes(sub);
    return { category: parent, subCategory: validUnderParent ? sub : cat };
  }

  // subCategory is valid under some jewelry parent → infer parent
  if (sub && JEWELRY_SUB_TO_PARENT[sub]) {
    const parent = JEWELRY_SUB_TO_PARENT[sub];
    return { category: parent, subCategory: sub };
  }

  // fallback: keep category only if it’s one of the 4 jewelry categories
  if (isValidCategory) {
    return { category: cat || undefined, subCategory: sub || undefined };
  }

  return { category: undefined, subCategory: undefined };
}
