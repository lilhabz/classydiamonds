// lib/catalog.ts
export const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    hero: string;
    heroSubtitle?: string;
    subcats: { key: string; label: string; image: string }[];
  }
> = {
  engagement: {
    label: "Engagement",
    hero: "/category-hero/engagement-ring-hero.jpg",
    heroSubtitle: "Signature solitaires and brilliant halos.",
    subcats: [],
  },
  "wedding-bands": {
    label: "Wedding Bands",
    hero: "/category-hero/wedding-band-hero.jpg",
    heroSubtitle: "Classic, comfort-fit, pavé and more.",
    subcats: [],
  },
  rings: {
    label: "Rings",
    hero: "/category-hero/ring-hero.jpg",
    heroSubtitle: "From timeless to statement designs.",
    subcats: [
      {
        key: "engagement",
        label: "Engagement",
        image: "/category/engagement-cat.jpg",
      },
      {
        key: "wedding-bands",
        label: "Wedding Bands",
        image: "/category/wedding-band-cat.jpg",
      },
    ],
  },
  bracelets: {
    label: "Bracelets",
    hero: "/category-hero/bracelet-hero.jpg",
    heroSubtitle: "Chain, cuff, tennis and more.",
    subcats: [],
  },
  necklaces: {
    label: "Necklaces & Pendants",
    hero: "/category-hero/necklace-hero.jpg",
    heroSubtitle: "Minimal to ornate — elevate every neckline.",
    subcats: [],
  },
  earrings: {
    label: "Earrings",
    hero: "/category-hero/earring-hero.jpg",
    heroSubtitle: "Studs, hoops, drops and more.",
    subcats: [],
  },
};
