// 📄 pages/jewelry.tsx – Filter strip = full-width horizontal scroller (desktop wheel-scroll + mobile swipe) | Cards match index ✅💎

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

export type ProductType = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  category: string;
  gender?: "unisex" | "him" | "her";
  description?: string;
};

/* --------------------------------- Helpers -------------------------------- */
const isRingCategory = (cat?: string) => ((cat ?? "").toLowerCase()).includes("ring");
const formatCategory = (cat: string) =>
  cat.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// Image map like Home (add more if you have more categories)
const CATEGORY_IMAGES: Record<string, string | undefined> = {
  All: undefined,
  Engagement: "/category/engagement-cat.jpg",
  "Wedding Bands": "/category/wedding-band-cat.jpg",
  Rings: "/category/ring-cat.jpg",
  Bracelets: "/category/bracelet-cat.jpg",
  Necklaces: "/category/necklace-cat.jpg",
  Earrings: "/category/earring-cat.jpg",
  Watches: "/category/watches-cat.jpg",
  "For Him": "/category/his-gift-cat.jpg",
  "For Her": "/category/her-gift-cat.jpg",
};
const imgFor = (label: string) =>
  CATEGORY_IMAGES[label] ?? `/category/${label.toLowerCase().replace(/\s+/g, "-")}-cat.jpg`;

/* ------------------------------ Category Tile ----------------------------- */
function CategoryTile({
  label,
  img,
  active,
  onClick,
  sizeClass,
  textClass,
}: {
  label: string;
  img?: string;
  active: boolean;
  onClick: () => void;
  /** width classes: e.g. "w-36 md:w-[180px] lg:w-[200px]" */
  sizeClass: string;
  /** text size classes for label */
  textClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 flex-shrink-0",
        "hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500",
        sizeClass,
      ].join(" ")}
      title={label}
    >
      <div className="relative aspect-[4/3] w-full bg-[#25304f]">
        {img ? <Image src={img} alt={label} fill className="object-cover" /> : null}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10" />
        <span
          className={[
            "absolute inset-0 flex items-center justify-center z-20 font-semibold text-white text-center px-3",
            "drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]",
            textClass,
          ].join(" ")}
        >
          {label}
        </span>
        <span
          aria-hidden
          className={[
            "pointer-events-none absolute inset-0 rounded-2xl",
            active ? "ring-2 ring-indigo-500" : "",
          ].join(" ")}
        />
      </div>
    </button>
  );
}

/* ---------------------------------- Page ---------------------------------- */
export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [genderFilter, setGenderFilter] = useState<"him" | "her" | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const initialMount = useRef(true);
  const router = useRouter();

  const resetCount = () => setVisibleCount(8);
  useEffect(() => { resetCount(); }, []);

  // Preselect from Home via localStorage
  useEffect(() => {
    const stored = localStorage.getItem("preselectedCategory");
    if (stored) {
      if (stored === "for-him") {
        setGenderFilter("him");
        setActiveCategory("All");
      } else if (stored === "for-her") {
        setGenderFilter("her");
        setActiveCategory("All");
      } else {
        setGenderFilter(null);
        setActiveCategory(stored);
      }
      resetCount();
      localStorage.removeItem("preselectedCategory");
      setTimeout(() => {
        if (heroRef.current) {
          const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
          window.scrollTo({ top: offset, behavior: "smooth" });
        }
      }, 0);
    }
  }, []);

  // Build categories from DB (de-duped, keep order alphabetical for consistency)
  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => (p.category || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  // Full filter list (no slicing): All + genders + DB categories
  const filterKeys = useMemo(() => ["All", "for-him", "for-her", ...allCategories], [allCategories]);

  // URL queries
  useEffect(() => {
    if (!router.isReady) return;
    const { category, gender, scroll } = router.query;

    if (gender === "him" || category === "for-him") {
      setGenderFilter("him");
      setActiveCategory("All");
    } else if (gender === "her" || category === "for-her") {
      setGenderFilter("her");
      setActiveCategory("All");
    } else if (typeof category === "string" && category) {
      setGenderFilter(null);
      setActiveCategory(category);
    }

    resetCount();

    if (scroll === "true" && heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [router.isReady]);

  // On filter change: reset & scroll to header
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    resetCount();
    headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeCategory, genderFilter]);

  // Wheel → horizontal scroll on desktop
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // If vertical wheel movement is dominant, scroll horizontally
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as EventListener);
  }, []);

  // Filtering
  const filteredByGender = genderFilter ? products.filter((p) => p.gender === genderFilter) : products;
  const filteredProducts = filteredByGender.filter((p) =>
    activeCategory === "All" ? true : p.category === activeCategory
  );

  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc = "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more.";

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
        <Image src="/hero-jewelry.jpg" alt="Jewelry Hero" fill className="object-cover" />
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

      {/* 💎 Category Filters (full-width scroller, works on mobile + desktop) */}
      <section
        ref={headerRef}
        className="pt-6 pb-6 px-0 sm:px-0 w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]"
        style={{ scrollMarginTop: "40px" }}
      >
        <div className="text-center mb-4 px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
            {genderFilter === "him"
              ? "For Him"
              : genderFilter === "her"
              ? "For Her"
              : activeCategory === "All"
              ? "Our Jewelry"
              : formatCategory(activeCategory)}
          </h2>
        </div>

        {/* Horizontal scroller */}
        <div
          ref={rowRef}
          className="overflow-x-auto py-3 [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {/* Hide WebKit scrollbar */}
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          <div className="flex gap-3 w-max px-4 sm:px-6">
            {/* All */}
            <CategoryTile
              label="All"
              img={imgFor("All")}
              active={activeCategory === "All" && !genderFilter}
              onClick={() => {
                setGenderFilter(null);
                setActiveCategory("All");
              }}
              sizeClass="w-32 xs:w-36 md:w-[180px] lg:w-[200px]"
              textClass="text-[12px] xs:text-[13px] md:text-[14px]"
            />

            {filterKeys
              .filter((k) => k !== "All")
              .map((key, i) => {
                const isGender = key === "for-him" || key === "for-her";
                const label = isGender ? (key === "for-him" ? "For Him" : "For Her") : formatCategory(key);
                const img = imgFor(label);
                const active =
                  (isGender && key === "for-him" && genderFilter === "him" && activeCategory === "All") ||
                  (isGender && key === "for-her" && genderFilter === "her" && activeCategory === "All") ||
                  (!isGender && activeCategory === key && !genderFilter);

                return (
                  <CategoryTile
                    key={`f-${key}-${i}`}
                    label={label}
                    img={img}
                    active={!!active}
                    onClick={() => {
                      if (isGender) {
                        setGenderFilter(key === "for-him" ? "him" : "her");
                        setActiveCategory("All");
                      } else {
                        setGenderFilter(null);
                        setActiveCategory(key);
                      }
                    }}
                    // Mobile a bit smaller; desktop nice and readable
                    sizeClass="w-32 xs:w-36 md:w-[180px] lg:w-[200px]"
                    textClass="text-[12px] xs:text-[13px] md:text-[14px]"
                  />
                );
              })}
          </div>
        </div>
      </section>

      {/* 🛒 Product Grid — EXACT index sizing */}
      <section className="mt-8 px-4 sm:px-6 max-w-7xl mx-auto mb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              className="group bg-[var(--bg-nav)] w-full sm:w-full md:w-[210px] lg:w-[233.61px] h-auto min-h-[387.61px] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 flex flex-col justify-between"
            >
              <Link
                href={
                  genderFilter
                    ? { pathname: `/category/${product.category}/${product.slug}`, query: { gender: genderFilter } }
                    : `/category/${product.category}/${product.slug}`
                }
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
                    router.push(`/category/${product.category}/${product.slug}`);
                    return;
                  }
                  addToCart({
                    id: product.id,
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

        {visibleCount < filteredProducts.length && (
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
export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const client = await clientPromise;
  let genderQuery: "him" | "her" | undefined;
  if (query.category === "for-him") genderQuery = "him";
  if (query.category === "for-her") genderQuery = "her";
  const filter = genderQuery ? { gender: genderQuery } : {};
  const productsRaw = await client.db().collection("products").find(filter).toArray();
  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image,
    category: p.category || "",
    gender: p.gender || "unisex",
    description: p.description || "",
  }));
  return { props: { products } };
};
