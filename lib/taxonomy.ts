// lib/taxonomy.ts
import type { Department } from "@/types/product";

/**
 * Authoritative taxonomy and helpers.
 * Jewelry categories + subcategories are exactly per your spec.
 * "Necklaces & pendants" is represented as "necklace-pendant".
 */

export const DEPARTMENTS: Department[] = ["jewelry", "watch"];

// Top-level categories per department
export const CATEGORIES: Record<Department, string[]> = {
  jewelry: ["ring", "earring", "bracelet", "necklace-pendant"],
  watch: ["watch", "strap", "accessory"], // keep for future
};

// Subcategories per (dept:category)
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
  // NECKLACES & PENDANTS — you said no subcategories defined yet
  "jewelry:necklace-pendant": [],

  // Watches (left as-is; you can edit later)
  "watch:watch": [],
  "watch:strap": [],
  "watch:accessory": [],
};

/**
 * Inverse map: subcategory -> its parent category
 * (only for jewelry; extend for watches later if needed)
 * Includes some common singular/plural variants for robustness.
 */
const JEWELRY_SUB_TO_PARENT: Record<
  string,
  "ring" | "earring" | "bracelet" | "necklace-pendant"
> = (() => {
  const map: Record<string, any> = {};

  // helper to add variants
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

  // earrings (plus singular variants)
  add("studs", "earring", ["stud"]);
  add("hoops", "earring", ["hoop"]);
  add("drops", "earring", ["drop"]);
  add("huggies", "earring", ["huggie"]);
  add("climbers", "earring", ["climber"]);

  // bracelets
  ["tennis", "bangle", "chain", "cuff"].forEach((s) => add(s, "bracelet"));

  // you can add necklace/pendant future subs here

  return map as Record<
    string,
    "ring" | "earring" | "bracelet" | "necklace-pendant"
  >;
})();

/** Key helpers */
export function getCategories(dept?: string): string[] {
  if (!dept) return [];
  return CATEGORIES[dept as Department] || [];
}

export function getSubCategories(dept?: string, cat?: string): string[] {
  if (!dept || !cat) return [];
  return SUBCATEGORIES[`${dept}:${cat}`] || [];
}

/** Normalize (category, subCategory) for jewelry, fixing swapped data */
export function normalizeJewelryCategoryPair(
  category?: string,
  subCategory?: string
): { category?: string; subCategory?: string } {
  const cat = (category || "").toLowerCase().trim();
  const sub = (subCategory || "").toLowerCase().trim();

  const isValidCategory = CATEGORIES.jewelry.includes(cat as any);
  const isValidSubForCat =
    isValidCategory && getSubCategories("jewelry", cat).includes(sub);

  // If data is already good, return as-is.
  if (isValidCategory && (sub === "" || isValidSubForCat)) {
    return { category: cat || undefined, subCategory: sub || undefined };
  }

  // If category is actually a known subcategory, promote parent category.
  if (cat && JEWELRY_SUB_TO_PARENT[cat]) {
    const parent = JEWELRY_SUB_TO_PARENT[cat];
    // If subCategory is empty, move cat into subCategory.
    if (!sub) {
      return { category: parent, subCategory: cat };
    }
    // If sub is also valid under inferred parent, keep it; otherwise keep only promoted one.
    const validUnderParent = getSubCategories("jewelry", parent).includes(sub);
    return {
      category: parent,
      subCategory: validUnderParent ? sub : cat,
    };
  }

  // If subCategory is valid under any jewelry parent, infer that parent.
  if (sub && JEWELRY_SUB_TO_PARENT[sub]) {
    const parent = JEWELRY_SUB_TO_PARENT[sub];
    return { category: parent, subCategory: sub };
  }

  // If nothing matches, pass through category if it's at least one of the 4 jewelry categories.
  if (isValidCategory) {
    return { category: cat || undefined, subCategory: sub || undefined };
  }

  // Fallback: no category/subCategory
  return { category: undefined, subCategory: undefined };
}
