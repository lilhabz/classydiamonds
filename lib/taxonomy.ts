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
    "wedding-bands", // ✅ canonical (was "wedding")
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

  // ✅ NECKLACES & PENDANTS — now populated (matches storefront)
  //    Route-style on storefront uses these same slugs.
  "jewelry:necklace-pendant": [
    "pendants",
    "chains",
    "solitaire",
    "nameplate",
    "lockets",
  ],

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
const METAL_OPTIONS = [
  "yellow-gold",
  "white-gold",
  "rose-gold",
  "platinum",
] as const;
const STONE_OPTIONS = [
  "diamond",
  "lab-grown",
  "moissanite",
  "gemstone",
] as const;
const SHAPE_OPTIONS = [
  "round",
  "oval",
  "princess",
  "emerald",
  "cushion",
  "pear",
] as const;

export const BASE_SPECS: Record<string, SpecField> = {
  // Match FiltersSidebar facets exactly:
  metal: { type: "select", options: [...METAL_OPTIONS] },
  stone: { type: "select", options: [...STONE_OPTIONS] },
  shape: { type: "select", options: [...SHAPE_OPTIONS] },

  // Additional detail (optional)
  karat: { type: "select", options: ["10k", "14k", "18k", "22k", "24k"] },
  carat: {
    type: "number",
    unit: "ct",
    step: 0.01,
    label: "Carat (total/primary)",
  },
  size: { type: "text", label: "Size (ring) / Length label" },
  length: { type: "number", unit: "in", step: 0.5, label: "Length" },
  width: { type: "number", unit: "mm", step: 0.1, label: "Width" },

  // Diamond-ish grading (slugs normalized to lowercase)
  color: { type: "text", label: "Color" },
  clarity: {
    type: "select",
    options: [
      "fl",
      "if",
      "vvs1",
      "vvs2",
      "vs1",
      "vs2",
      "si1",
      "si2",
      "i1",
      "i2",
      "i3",
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
    "stone",
    "carat",
    "clarity",
    "shape",
    "size",
    "custom",
  ],
  "jewelry:earring": ["metal", "karat", "stone", "carat", "shape", "custom"],
  "jewelry:bracelet": [
    "metal",
    "karat",
    "stone",
    "carat",
    "length",
    "width",
    "custom",
  ],
  "jewelry:necklace-pendant": [
    "metal",
    "karat",
    "stone",
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
  add("wedding-bands", "ring", ["wedding"]); // ✅ canonical + legacy alias
  ["engagement", "promise", "eternity", "birthstone", "signet", "mens"].forEach(
    (s) => add(s, "ring")
  );

  // earrings (singular/plural)
  add("studs", "earring", ["stud"]);
  add("hoops", "earring", ["hoop"]);
  add("drops", "earring", ["drop"]);
  add("huggies", "earring", ["huggie"]);
  add("climbers", "earring", ["climber"]);

  // bracelets
  ["tennis", "bangle", "chain", "cuff"].forEach((s) => add(s, "bracelet"));

  // ✅ necklaces & pendants (support both plural + singular variants)
  add("pendants", "necklace-pendant", ["pendant"]);
  add("chains", "necklace-pendant", ["chain"]);
  add("lockets", "necklace-pendant", ["locket"]);
  add("nameplate", "necklace-pendant"); // same singular form
  add("solitaire", "necklace-pendant"); // same singular form

  return map as Record<
    string,
    "ring" | "earring" | "bracelet" | "necklace-pendant"
  >;
})();

/** ---------- Storefront route vs admin base helpers ---------- */
// Subcats that get a "-rings" route on the storefront
export const RING_SUFFIXABLE_SUBS = new Set([
  "engagement",
  "eternity",
  "promise",
  "fashion",
  "anniversary",
  "halo",
  "solitaire",
  "three-stone",
  "bridal-set",
  "signet",
]);

/** Convert an admin base sub to the storefront route sub (e.g., "engagement" → "engagement-rings"). */
export function toRouteSubcategory(
  category?: string,
  sub?: string | null
): string | null {
  const c = (category || "").toLowerCase().trim();
  let s = (sub || "").toLowerCase().trim();
  if (!s) return s || null;

  if (c === "ring" || c === "rings") {
    if (s === "wedding") s = "wedding-bands";
    if (s === "wedding-bands") return "wedding-rings"; // storefront slug
    if (s === "mens") return s; // keep as-is (no -rings)
    return RING_SUFFIXABLE_SUBS.has(s) ? `${s}-rings` : s;
  }

  // ✅ Normalize necklace/pendant base → storefront route slugs (plural where applicable)
  if (
    c === "necklace-pendant" ||
    c === "necklaces" ||
    c === "necklaces-pendants"
  ) {
    if (s === "pendant") return "pendants";
    if (s === "chain") return "chains";
    if (s === "locket") return "lockets";
    // nameplate / solitaire already match route slugs
    return s;
  }

  return s;
}

/** Convert a storefront route sub back to the admin base sub (e.g., "engagement-rings" → "engagement"). */
export function toBaseSubcategory(
  category?: string,
  sub?: string | null
): string | null {
  const c = (category || "").toLowerCase().trim();
  let s = (sub || "").toLowerCase().trim();
  if (!s) return s || null;

  if (c === "ring" || c === "rings") {
    if (s.endsWith("-rings")) s = s.replace(/-rings$/, "");
    if (s === "wedding") s = "wedding-bands";
    return s;
  }

  // ✅ Make necklace/pendant inputs consistent with our admin base list (pluralized where needed)
  if (
    c === "necklace-pendant" ||
    c === "necklaces" ||
    c === "necklaces-pendants"
  ) {
    if (s === "pendant") return "pendants";
    if (s === "chain") return "chains";
    if (s === "locket") return "lockets";
    // nameplate / solitaire already canonical
    return s;
  }

  return s;
}

export function normalizeJewelryCategoryPair(
  category?: string,
  subCategory?: string
): { category?: string; subCategory?: string } {
  let cat = (category || "").toLowerCase().trim();
  let sub = (subCategory || "").toLowerCase().trim();

  // 🔧 Accept common variants/legacy for necklaces to our admin canonical
  if (
    cat === "necklaces" ||
    cat === "necklaces-pendants" ||
    cat === "necklace"
  ) {
    cat = "necklace-pendant";
  }

  // Accept route-style ring subs (e.g., "engagement-rings") and normalize to base.
  if (cat === "ring" || cat === "rings") {
    sub = toBaseSubcategory(cat, sub) || "";
    cat = "ring"; // admin canonical is singular
  }

  // If category itself is a route-style ring sub (e.g., "engagement-rings"), treat it as a sub
  if (/-rings$/.test(cat)) {
    const base = cat.replace(/-rings$/, "");
    if (JEWELRY_SUB_TO_PARENT[base]) {
      cat = "ring";
      sub = base;
    }
  }

  // Also normalize necklaces route-style/singular inputs
  if (cat === "necklace-pendant") {
    sub = toBaseSubcategory(cat, sub) || sub;
  }

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
  if (sub) {
    // tolerate route-style input for rings and singular necklace inputs
    const ringBase = toBaseSubcategory("ring", sub) || sub;
    const neckBase = toBaseSubcategory("necklace-pendant", sub) || sub;
    const candidate = JEWELRY_SUB_TO_PARENT[ringBase] ? ringBase : neckBase;

    if (JEWELRY_SUB_TO_PARENT[candidate]) {
      const parent = JEWELRY_SUB_TO_PARENT[candidate];
      return { category: parent, subCategory: candidate };
    }
  }

  // fallback: keep category only if it’s one of the 4 jewelry categories
  if (isValidCategory) {
    return { category: cat || undefined, subCategory: sub || undefined };
  }

  return { category: undefined, subCategory: undefined };
}
