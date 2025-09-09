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
// ➕ Added tolerant synonyms for the admin label "necklace-pendant" (and plural variant)
const CANONICALIZE_TABLE: Record<string, Category> = {
  ring: "rings",
  rings: "rings",
  earring: "earrings",
  earrings: "earrings",
  bracelet: "bracelets",
  bracelets: "bracelets",
  necklace: "necklaces-pendants",
  necklaces: "necklaces-pendants",
  "necklace-pendant": "necklaces-pendants", // ← added
  "necklace-pendants": "necklaces-pendants", // ← added
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
 * - legacy/alternate forms used in admin or old data
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

  // Legacy/alternate aliases for necklaces-pendants (observed in admin/data)
  const legacyForNecklaces = [
    "necklaces", // old plural-only
    "necklace-pendant", // admin single form (problem case)
    "necklace-pendants", // plural hyphenated
  ];

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
 * Handles common typos/variants, plural→singular, and category-specific suffixes.
 *
 * Examples:
 * - rings:
 *    mens-rings         → mens
 *    wedding-rings      → wedding-bands
 *    weddings-rings     → wedding-bands (typo)
 *    engagement-rings   → engagement
 *    eternity-rings     → eternity
 *    eterity-rings      → eternity (typo)
 *    promise-rings      → promise
 *    birthstone-rings   → birthstone
 *    signet-rings       → signet
 *    signant-rings      → signet (typo)
 * - bracelets:
 *    tennis-bracelets   → tennis
 *    chain-bracelets    → chains
 *    bangle             → bangle  (pass-through)
 *    cuff               → cuff    (pass-through)
 * - necklaces & pendants:
 *    pendants           → pendant
 *    chains             → chain
 *    nameplates         → nameplate
 *    lockets            → locket
 */
export function toBaseSubcategory(subSlug: string, category: string): string {
  let s = String(subSlug || "")
    .toLowerCase()
    .trim();
  const catCanon =
    canonicalizeCategory(String(category || "").toLowerCase()) ??
    String(category || "").toLowerCase();

  // ✅ Hard corrections for known typos & variants
  const corrections: Record<string, string> = {
    // rings
    "weddings-rings": "wedding-bands",
    "wedding-rings": "wedding-bands",
    "engagement-rings": "engagement",
    "eterity-rings": "eternity",
    "eternity-rings": "eternity",
    "signant-rings": "signet",
    "signet-rings": "signet",
    "promise-rings": "promise",
    "birthstone-rings": "birthstone",
    "mens-rings": "mens",

    // bracelets
    "tennis-bracelets": "tennis",
    "chain-bracelets": "chains",
    bangle: "bangle",
    cuff: "cuff",

    // necklaces & pendants (normalize to singular bases)
    pendants: "pendant",
    chains: "chain",
    solitaire: "solitaire",
    nameplate: "nameplate",
    nameplates: "nameplate",
    lockets: "locket",
    locket: "locket",
  };
  if (corrections[s]) return corrections[s];

  // ✅ Generic suffix trimming by family
  if (catCanon === "rings") {
    if (s.endsWith("-rings")) s = s.slice(0, -6);
    if (s.endsWith("-ring")) s = s.slice(0, -5);
    if (s === "wedding") s = "wedding-bands";
  }

  if (catCanon === "bracelets") {
    if (s.endsWith("-bracelets")) s = s.slice(0, -11);
    if (s.endsWith("-bracelet")) s = s.slice(0, -10);
  }

  if (catCanon === "necklaces-pendants") {
    // normalize plurals → singular bases
    if (s.endsWith("s")) s = s.slice(0, -1);
  }

  return s;
}
