// data/taxonomy.ts

export type Category =
  | "rings"
  | "necklaces-pendants"
  | "earrings"
  | "bracelets"
  | "watches";

export const JEWELRY_CATEGORIES = [
  "rings",
  "necklaces-pendants",
  "earrings",
  "bracelets",
] as const;

export const WATCHES_CATEGORY = "watches" as const;

export const CATEGORY_LABELS: Record<Category, string> = {
  rings: "Rings",
  "necklaces-pendants": "Necklaces & Pendants",
  earrings: "Earrings",
  bracelets: "Bracelets",
  watches: "Watches",
};

// 🔒 Official subcategories (slugs) by category (route-style)
export const SUBCATEGORY_MAP: Record<Category, string[]> = {
  rings: [
    "engagement-rings",
    "wedding-rings",
    "promise-rings",
    "eternity-rings",
    "birthstone-rings",
    "signet-rings",
    "mens-rings",
  ],
  "necklaces-pendants": [
    "pendants",
    "chains",
    "solitaire",
    "nameplate",
    "lockets",
  ],
  earrings: ["studs", "hoops", "drops", "huggies", "climbers"],
  bracelets: ["tennis-bracelets", "bangle", "chain-bracelets", "cuff"],
  watches: ["men", "women"], // optional, not used on jewelry pages
};

export const NONE_OPTION = "— None —";
export const CUSTOM_OPTION = "Custom…";

export const subcategoryOptionsFor = (cat: Category) => {
  const base = SUBCATEGORY_MAP[cat] || [];
  return [NONE_OPTION, ...base, CUSTOM_OPTION];
};

export const isWatch = (cat: Category) => cat === "watches";
export const isJewelry = (cat: Category) =>
  (JEWELRY_CATEGORIES as readonly string[]).includes(cat as any);

// ✅ Canonicalize URL/category inputs to our taxonomy keys (plural canonical)
const CANONICALIZE_TABLE: Record<string, Category> = {
  ring: "rings",
  rings: "rings",
  earring: "earrings",
  earrings: "earrings",
  bracelet: "bracelets",
  bracelets: "bracelets",
  necklace: "necklaces-pendants",
  necklaces: "necklaces-pendants",
  "necklaces-pendants": "necklaces-pendants",
  watches: "watches",
};

export function canonicalizeCategory(raw: string): Category | null {
  const k = String(raw || "").toLowerCase();
  return CANONICALIZE_TABLE[k] ?? null;
}

/**
 * 🧭 categoryCandidatesFor
 * Returns a tolerant set of category strings to match in the DB:
 * - canonical plural (e.g., "rings")
 * - common singular (e.g., "ring")
 * - legacy plural (e.g., "necklaces") for necklaces-pendants
 * - the raw incoming value
 */
export function categoryCandidatesFor(raw: string): string[] {
  const incoming = String(raw || "").toLowerCase();
  const canon = canonicalizeCategory(incoming) ?? incoming;

  const singularByPlural: Record<string, string> = {
    rings: "ring",
    earrings: "earring",
    bracelets: "bracelet",
    "necklaces-pendants": "necklace",
    watches: "watch",
  };

  // Legacy aliases for necklaces-pendants
  const legacyForNecklaces = ["necklaces"];

  const set = new Set<string>([incoming, canon]);

  const singular = singularByPlural[canon];
  if (singular) set.add(singular);

  if (canon === "necklaces-pendants") {
    legacyForNecklaces.forEach((v) => set.add(v));
  }

  return Array.from(set);
}

/**
 * 🔧 toBaseSubcategory
 * Converts route-style subcategory slugs into DB "base" slugs.
 * Examples:
 * - rings:
 *    mens-rings         → mens
 *    wedding-rings      → wedding-bands
 *    engagement-rings   → engagement
 *    eternity-rings     → eternity
 *    promise-rings      → promise
 * - bracelets:
 *    tennis-bracelets   → tennis
 *    chain-bracelets    → chains
 *    bangle             → bangle  (pass-through)
 *    cuff               → cuff    (pass-through)
 * Other categories usually pass through unchanged.
 */
export function toBaseSubcategory(subSlug: string, category: string): string {
  const s0 = String(subSlug || "")
    .toLowerCase()
    .trim();
  const catCanon =
    canonicalizeCategory(String(category || "").toLowerCase()) ??
    String(category || "").toLowerCase();

  // Fast path for known special cases
  const specials: Record<string, string> = {
    "wedding-rings": "wedding-bands",
    "engagement-rings": "engagement",
    "tennis-bracelets": "tennis",
    "chain-bracelets": "chains",
  };
  if (specials[s0]) return specials[s0];

  // Generic suffix trimming by category family
  let s = s0;

  if (catCanon === "rings") {
    if (s.endsWith("-rings")) s = s.slice(0, -6); // "-rings"
    if (s.endsWith("-ring")) s = s.slice(0, -5); // "-ring"
    if (s === "wedding") s = "wedding-bands";
  }

  if (catCanon === "bracelets") {
    if (s.endsWith("-bracelets")) s = s.slice(0, -11); // "-bracelets"
    if (s.endsWith("-bracelet")) s = s.slice(0, -10); // "-bracelet"
  }

  // Other categories typically store base = route (studs, hoops, pendants, etc.)
  return s;
}
