// pages/jewelry.tsx — All Jewelry by default + 4 categories + subcategory pills (no title)
"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import { GetServerSideProps } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryGrid, { CategoryItem } from "@/components/CategoryGrid";

export type ProductType = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  category: string; // "rings" | "earrings" | "bracelets" | "necklaces"
  subcategory?: string; // used for ring/earring/etc. sub-filters
  gender?: "unisex" | "him" | "her";
  description?: string;
};

type SubItem = { label: string; slug: string };
type CategorySlug = "rings" | "earrings" | "bracelets" | "necklaces";
const ALLOWED: readonly CategorySlug[] = [
  "rings",
  "earrings",
  "bracelets",
  "necklaces",
] as const;

/* --------------------------------- Helpers -------------------------------- */
const isRingCategory = (cat?: string) =>
  (cat ?? "").toLowerCase().includes("ring");

/* ------------------------------- Constants -------------------------------- */
// 4 category tiles only
const CATEGORY_ITEMS: CategoryItem[] = [
  { label: "Rings", slug: "rings", image: "/category/ring-cat.jpg" },
  { label: "Earrings", slug: "earrings", image: "/category/earring-cat.jpg" },
  {
    label: "Bracelets",
    slug: "bracelets",
    image: "/category/bracelet-cat.jpg",
  },
  {
    label: "Necklaces & Pendants",
    slug: "necklaces",
    image: "/category/necklace-cat.jpg",
  },
];

// Subcategory pills (shown only when a category is selected)
const SUBS: Record<CategorySlug, SubItem[]> = {
  rings: [
    { label: "All", slug: "all" },
    { label: "Engagement", slug: "engagement" }, // requested
    { label: "Wedding Bands", slug: "wedding-bands" }, // requested
    { label: "Solitaire", slug: "solitaire" },
    { label: "Halo", slug: "halo" },
    { label: "Three-Stone", slug: "three-stone" },
    { label: "Eternity", slug: "eternity" },
    { label: "Men’s", slug: "mens" },
  ],
  earrings: [
    { label: "All", slug: "all" },
    { label: "Studs", slug: "studs" },
    { label: "Hoops", slug: "hoops" },
    { label: "Drops", slug: "drops" },
    { label: "Huggies", slug: "huggies" },
  ],
  bracelets: [
    { label: "All", slug: "all" },
    { label: "Tennis", slug: "tennis" },
    { label: "Bangles", slug: "bangles" },
    { label: "Cuffs", slug: "cuffs" },
    { label: "Chains", slug: "chains" },
  ],
  necklaces: [
    { label: "All", slug: "all" },
    { label: "Pendants", slug: "pendants" },
    { label: "Solitaire", slug: "solitaire" },
    { label: "Station", slug: "station" },
    { label: "Nameplates", slug: "nameplates" },
    { label: "Pearl", slug: "pearl" },
  ],
};

// Map for nicer headings
const CATEGORY_LABELS: Record<CategorySlug, string> = {
  rings: "Rings",
  earrings: "Earrings",
  bracelets: "Bracelets",
  necklaces: "Necklaces & Pendants",
};

/* ---------------------------------- Page ---------------------------------- */
export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);

  // When null => All Jewelry
  const [activeCategorySlug, setActiveCategorySlug] =
    useState<CategorySlug | null>(null);
  const [activeSub, setActiveSub] = useState<string>("all");

  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const resetCount = () => setVisibleCount(8);

  // Read ?category and ?sub on load/shallow nav; default is "All Jewelry"
  useEffect(() => {
    if (!router.isReady) return;
    const { category, sub, scroll } = router.query;

    if (
      typeof category === "string" &&
      ALLOWED.includes(category.toLowerCase() as CategorySlug)
    ) {
      const cat = category.toLowerCase() as CategorySlug; // ✅ narrowed; not null
      setActiveCategorySlug(cat);

      const subs = SUBS[cat];
      if (
        typeof sub === "string" &&
        subs?.some((s: SubItem) => s.slug.toLowerCase() === sub.toLowerCase())
      ) {
        setActiveSub(sub.toLowerCase());
      } else {
        setActiveSub("all");
      }
    } else {
      setActiveCategorySlug(null);
      setActiveSub("all");
    }

    resetCount();

    if (scroll === "true" && heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [router.isReady, router.query]);

  // When category changes via click, reset count and scroll to header
  useEffect(() => {
    resetCount();
    headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeCategorySlug]);

  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    "Explore timeless rings, earrings, bracelets, and necklaces & pendants.";

  // Build sub pills for current category
  const subPills: SubItem[] = activeCategorySlug
    ? SUBS[activeCategorySlug] ?? [{ label: "All", slug: "all" }]
    : [];

  // Compute products to show:
  // - no category selected => all products
  // - category selected => filter by category, then by sub if not "all"
  const shown = useMemo(() => {
    if (!activeCategorySlug) return products; // All jewelry
    const byCat = products.filter(
      (p) => (p.category || "").toLowerCase() === activeCategorySlug
    );
    if (activeSub === "all") return byCat;
    return byCat.filter(
      (p) => (p.subcategory || "").toLowerCase() === activeSub
    );
  }, [products, activeCategorySlug, activeSub]);

  const totalProducts = shown.length;

  // Push URL when user clicks a top category tile
  const goCategory = (slug: CategorySlug) => {
    setActiveCategorySlug(slug);
    setActiveSub("all");
    router.push(
      { pathname: "/jewelry", query: { category: slug, scroll: "true" } },
      undefined,
      { shallow: true }
    );
  };

  // Push URL when user clicks a sub pill
  const goSub = (slug: string) => {
    if (!activeCategorySlug) return;
    setActiveSub(slug);
    const query =
      slug === "all"
        ? { category: activeCategorySlug }
        : { category: activeCategorySlug, sub: slug };
    router.push({ pathname: "/jewelry", query }, undefined, { shallow: true });
  };

  // Heading text
  const heading = activeCategorySlug
    ? CATEGORY_LABELS[activeCategorySlug]
    : "All Jewelry";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* 🌟 Hero */}
      <section
        ref={heroRef}
        className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden"
      >
        <Image
          src="/hero-jewelry.jpg"
          alt="Jewelry Hero"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-6xl font-serif font-bold tracking-wider leading-snug mb-4 text-[var(--foreground)]">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto text-[var(--foreground)] leading-relaxed tracking-wide">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>

      {/* 🧭 Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-8">
        <Breadcrumbs />
      </div>

      {/* 💎 Category Tiles (Top Section) */}
      <section
        ref={headerRef}
        className="pt-6 pb-4 px-0 sm:px-0 w-full"
        style={{ scrollMarginTop: "40px" }}
      >
        <CategoryGrid
          items={CATEGORY_ITEMS}
          title="Shop by Category"
          fullBleedDesktop
          desktopCols={4}
          activeSlug={activeCategorySlug ?? undefined}
          routeTo="/jewelry" // stay on /jewelry, adjust query
          onSelect={(slug) => goCategory(slug as CategorySlug)}
        />
      </section>

      {/* 🔖 Subcategory pills (only visible when a category is selected) */}
      {activeCategorySlug && (
        <section className="mt-2 mb-6 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <h3 className="sr-only">Filters</h3> {/* no visible title */}
            {/* mobile */}
            <div className="sm:hidden mt-1 overflow-x-auto">
              <div className="flex gap-2 w-max">
                {subPills.map((s: SubItem) => {
                  const active = activeSub === s.slug.toLowerCase();
                  return (
                    <button
                      key={s.slug}
                      onClick={() => goSub(s.slug)}
                      className={
                        "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border " +
                        (active
                          ? "bg-white text-[#1f2a44] border-white"
                          : "bg-[#25304f] text-white border-white/20 hover:bg-[#2b3760]")
                      }
                      aria-pressed={active}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* desktop */}
            <div className="hidden sm:flex gap-2 mt-1 flex-wrap">
              {subPills.map((s: SubItem) => {
                const active = activeSub === s.slug.toLowerCase();
                return (
                  <button
                    key={s.slug}
                    onClick={() => goSub(s.slug)}
                    className={
                      "px-3 py-2 rounded-lg text-sm font-medium border " +
                      (active
                        ? "bg-white text-[#1f2a44] border-white"
                        : "bg-[#25304f] text-white border-white/20 hover:bg-[#2b3760]")
                    }
                    aria-pressed={active}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 🏷️ Dynamic heading */}
      <div className="text-center mt-2 px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
          {heading}
        </h2>
      </div>

      {/* 🛒 Product Grid — shows all, or filtered by category/subcategory */}
      <section className="mt-8 px-4 sm:px-6 max-w-7xl mx-auto mb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {shown.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              className="group bg-[var(--bg-nav)] w-full sm:w-full md:w-[210px] lg:w-[233.61px] h-auto min-h-[387.61px] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 flex flex-col justify-between"
            >
              <Link
                href={`/category/${product.category}/${product.slug}`}
                className="flex-1 flex flex-col h-full"
              >
                <div className="relative w-full aspect-square">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 text-center flex-1 flex flex-col justify-between">
                  <h3 className="font-semibold text-[var(--foreground)] truncate text-sm tracking-wide leading-snug">
                    {product.name}
                  </h3>
                  <p className="text-[#cfd2d6] text-sm leading-relaxed tracking-wide">
                    {product.salePrice ? (
                      <>
                        <span className="line-through mr-1">
                          ${product.price.toLocaleString()}
                        </span>
                        <span className="text-green-500">
                          ${product.salePrice.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>${product.price.toLocaleString()}</>
                    )}
                  </p>
                </div>
              </Link>

              {/* 🔁 Quick add for non-rings; redirect for rings */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (isRingCategory(product.category)) {
                    router.push(
                      `/category/${product.category}/${product.slug}`
                    );
                    return;
                  }
                  addToCart({
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    price: product.price,
                    discountedPrice: product.salePrice ?? undefined,
                    image: product.image,
                    quantity: 1,
                  });
                }}
                className="m-4 px-6 py-3 bg-[#e0e0e0] text-[#1f2a44] rounded-xl hover:scale-105 transition"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>

        {visibleCount < totalProducts && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setVisibleCount((v) => v + 4)}
              className="px-8 py-4 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-full"
            >
              Load More
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ----------------------------- Server-side data ---------------------------- */
export const getServerSideProps: GetServerSideProps = async () => {
  const client = await clientPromise;

  // Fetch all products; client filters by category/subcat
  const productsRaw = await client
    .db()
    .collection("products")
    .find({})
    .toArray();

  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image,
    category: (p.category || "").toLowerCase(),
    subcategory: (p.subcategory ?? p.subCategory ?? "").toLowerCase(),
    gender: p.gender || "unisex",
    description: p.description || "",
  }));

  return { props: { products } };
};
