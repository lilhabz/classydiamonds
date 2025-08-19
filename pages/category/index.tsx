// pages/category/index.tsx
"use client";

import Head from "next/head";
import CategoryGrid, { CategoryItem } from "@/components/CategoryGrid";

const CATEGORIES: CategoryItem[] = [
  { label: "Engagement",     slug: "engagement",     image: "/category/engagement.jpg" },
  { label: "Wedding Bands",  slug: "wedding-bands",  image: "/category/wedding-bands.jpg" },
  { label: "Rings",          slug: "rings",          image: "/category/rings.jpg" },
  { label: "Bracelets",      slug: "bracelets",      image: "/category/bracelets.jpg" },
  { label: "Necklaces",      slug: "necklaces",      image: "/category/necklaces.jpg" },
  { label: "Earrings",       slug: "earrings",       image: "/category/earrings.jpg" },
  { label: "For Her",        slug: "for-her",        image: "/category/for-her.jpg" },
  { label: "For Him",        slug: "for-him",        image: "/category/for-him.jpg" },
];

export default function CategoryHome() {
  return (
    <>
      <Head>
        <title>Categories | Classy Diamonds</title>
        <meta name="description" content="Browse categories at Classy Diamonds." />
      </Head>

      <CategoryGrid
        items={CATEGORIES}
        title="Categories"
        fullBleedDesktop
        desktopCols={6}
        activeSlug={null}
        routeTo="/category"
      />
    </>
  );
}
