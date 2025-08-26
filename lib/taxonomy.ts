// lib/taxonomy.ts
import type { Department } from "@/types/product";

/**
 * Authoritative taxonomy + helpers
 * - Jewelry categories/subcategories exactly as requested
 * - "Necklaces & pendants" is represented as "necklace-pendant"
 * - Includes spec (filter) config + helper to render dynamic spec fields
 */

export const DEPARTMENTS: Department[] = ["jewelry", "watch"];

/** Top-level categories per department */
export const CATEGORIES: Record<Department, string[]> = {
  jewelry: ["ring", "earring", "bracelet", "necklace-pendant"],
  watch: ["watch", "strap", "accessory"], // keep for later
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
  // NECKLACES & PENDANTS — no subs yet (per your note)
  "jewelry:necklace-pendant": [],

  // Watches (left blank for now)
  "watch:watch": [],
  "watch:strap": [],
  "watch:accessory": [],
};

/** ---------- Specs (filters) config ---------- */
/**
 * BASE_SPECS defines available fields; SPEC_CONFIG picks which to show for each (dept:cat[:sub]?).
 * You can tweak SPEC_CONFIG later without touching UI/API code.
 */
type SpecField =
  | { type: "select"; options: string[] }
  | { type: "number"; unit?: string; step?: number }
  | { type: "text" }
  | { type: "boolean"; label?: string };

export const BASE_SPECS: Record<string, SpecField> = {
  metal: {
    type: "select",
    options: [
      "gold",
      "white gold",
      "rose gold",
      "platinum",
      "silver",
      "stainless steel",
      "titanium",
    ],
  },
  karat: { type: "select", options: ["10k", "14k", "18k", "22k", "24k"] },
  gemstone: {
    type: "select",
    options: [
      "diamond",
      "lab diamond",
      "moissanite",
      "emerald",
      "ruby",
      "sapphire",
      "none",
    ],
  },
  carat: { type: "number", unit: "ct", step: 0.01 },
  size: { type: "text" }, // ring size / chain length string if needed
  length: { type: "number", unit: "in", step: 0.5 },
  width: { type: "number", unit: "mm", step: 0.1 },
  color: { type: "text" },
  clarity: {
    type: "select",
    options: [
      "FL",
      "IF",
      "VVS1",
      "VVS2",
      "VS1",
      "VS2",
      "SI1",
      "SI2",
      "I1",
      "I2",
      "I3",
    ],
  },
  cut: {
    type: "select",
    options: [
      "Round",
      "Princess",
      "Emerald",
      "Asscher",
      "Cushion",
      "Marquise",
      "Oval",
      "Radiant",
      "Pear",
      "Heart",
    ],
  },
  custom: { type: "boolean", label: "Custom work" },
};

/** Which spec fields to show by (dept:category[:sub]?) */
export const SPEC_CONFIG: Record<string, (keyof typeof BASE_SPECS)[]> = {
  // Jewelry
  "jewelry:ring": [
    "metal",
    "karat",
    "gemstone",
    "carat",
    "clarity",
    "cut",
    "size",
    "custom",
  ],
  "jewelry:earring": ["metal", "karat", "gemstone", "carat", "custom"],
  "jewelry:bracelet": [
    "metal",
    "karat",
    "gemstone",
    "carat",
    "length",
    "width",
    "custom",
  ],
  // even without subs, we can still filter necklace/pendant by basics:
  "jewelry:necklace-pendant": [
    "metal",
    "karat",
    "gemstone",
    "carat",
    "length",
    "custom",
  ],

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
  [
    "engagement",
    "wedding",
    "promise",
    "eternity",
    "birthstone",
    "signet",
    "mens",
  ].forEach((s) => add(s, "ring"));

  // earrings (singular/plural)
  add("studs", "earring", ["stud"]);
  add("hoops", "earring", ["hoop"]);
  add("drops", "earring", ["drop"]);
  add("huggies", "earring", ["huggie"]);
  add("climbers", "earring", ["climber"]);

  // bracelets
  ["tennis", "bangle", "chain", "cuff"].forEach((s) => add(s, "bracelet"));

  // (no subs yet for necklace-pendant)
  return map as Record<
    string,
    "ring" | "earring" | "bracelet" | "necklace-pendant"
  >;
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
