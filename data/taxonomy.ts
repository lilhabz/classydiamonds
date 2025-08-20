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

// 🟡 Rings now exactly matches your list (slugged for URLs/database)
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
  watches: ["men", "women"],
};

export const NONE_OPTION = "— None —";
export const CUSTOM_OPTION = "Custom…";

export const subcategoryOptionsFor = (cat: Category) => {
  const base = SUBCATEGORY_MAP[cat] || [];
  return [NONE_OPTION, ...base, CUSTOM_OPTION];
};

export const isWatch = (cat: Category) => cat === "watches";
export const isJewelry = (cat: Category) =>
  (JEWELRY_CATEGORIES as readonly string[]).includes(cat);
