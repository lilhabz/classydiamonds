// pages/category/index.tsx
"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import CategoryGrid, { CategoryItem } from "@/components/CategoryGrid";

const CATEGORIES: CategoryItem[] = [
  { label: "Engagement",     slug: "engagement",             image: "/category/engagement.jpg" },
  { label: "Wedding Bands",  slug: "wedding-bands",          image: "/category/wedding-bands.jpg" },
  { label: "Rings",          slug: "rings",                  image: "/category/rings.jpg" },
  { label: "Bracelets",      slug: "bracelets",              image: "/category/bracelets.jpg" },
  { label: "Necklaces & Pendants", slug: "necklaces-pendants", image: "/category/necklaces.jpg" },
  { label: "Earrings",       slug: "earrings",               image: "/category/earrings.jpg" },
  // ⛔ Removed "For Her"/"For Him" from CategoryGrid; added below with direct /jewelry?audience= links
];

const AUDIENCE_TILES = [
  { label: "For Her", image: "/category/for-her.jpg", href: { pathname: "/jewelry", query: { audience: "her" } } },
  { label: "For Him", image: "/category/for-him.jpg", href: { pathname: "/jewelry", query: { audience: "him" } } },
];

export default function CategoryHome() {
  return (
    <>
      <Head>
        <title>Categories | Classy Diamonds</title>
        <meta name="description" content="Browse categories at Classy Diamonds." />
      </Head>

      {/* Core category grid routes to /category/<slug> */}
      <CategoryGrid
        items={CATEGORIES}
        title="Categories"
        fullBleedDesktop
        desktopCols={6}
        activeSlug={null}
        routeTo="/category"
      />

      {/* Audience row routes straight to /jewelry?audience=... */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mt-10 mb-14">
        <h2 className="text-xl sm:text-2xl font-serif font-semibold tracking-wide text-center mb-6">
          Shop by Audience
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
          {AUDIENCE_TILES.map(({ label, image, href }) => (
            <Link
              key={label}
              href={href}
              className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300"
            >
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={image}
                  alt={label}
                  fill
                  className="object-cover rounded-xl group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/35" />
                <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-semibold text-white z-10">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
