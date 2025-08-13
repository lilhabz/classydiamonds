// 📄 pages/jewelry.tsx – Horizontal (one-line) desktop category photo tiles + sticky bar + matching product cards ✅💎

"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import { GetServerSideProps } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

export type ProductType = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  gender?: "unisex" | "him" | "her";
  description?: string;
};

// 🔹 Big, readable image tile for filters
function CategoryTile({
  name,
  src,
  active,
  onClick,
}: {
  name: string;
  src?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="w-full group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
      title={name}
    >
      <div className="relative aspect-[4/3] w-full bg-[#25304f]">
        {src ? (
          <Image
            src={src}
            alt={name}
            fill
            sizes="(max-width: 640px) 200px, (max-width: 1024px) 220px, 240px"
            className="object-cover"
          />
        ) : null}

        {/* overlay for readability */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10" />

        {/* label — big & readable with subtle shadow */}
        <span
          className="absolute inset-0 flex items-center justify-center z-20 font-semibold text-white text-center px-3
                         text-sm sm:text-base md:text-lg lg:text-xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
        >
          {name}
        </span>

        {/* active ring */}
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

const isRingCategory = (cat?: string) =>
  (cat ?? "").toLowerCase().includes("ring");
const formatCategory = (cat: string) =>
  cat.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [genderFilter, setGenderFilter] = useState<"him" | "her" | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const initialMount = useRef(true);
  const router = useRouter();

  const resetCount = () => setVisibleCount(8);

  useEffect(() => {
    resetCount();
  }, []);

  // pick up preselected from Home
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
        setActiveCategory(stored);
        setGenderFilter(null);
      }
      resetCount();
      localStorage.removeItem("preselectedCategory");
      setTimeout(scrollBelowHero, 0);
    }
  }, []);

  // Build safe, de-duped categories
  const allCategories = Array.from(
    new Set(products.map((p) => (p.category || "").trim()))
  ).filter(Boolean);

  // Filters list: "All" + DB categories + Gender tiles (value = machine, label = display)
  type FilterItem = { value: string; label: string; isGender?: boolean };
  const baseFilters: FilterItem[] = allCategories.map((value) => ({
    value, // compare against p.category
    label: formatCategory(value), // show pretty label
  }));
  const genderFilters: FilterItem[] = [
    { value: "for-him", label: "For Him", isGender: true },
    { value: "for-her", label: "For Her", isGender: true },
  ];
  // Ensure we only show 9 category entries + 1 "All" to make 10 total on desktop
  const limitedBase = baseFilters.slice(
    0,
    Math.max(0, 9 - genderFilters.length)
  ); // leave room for gender tiles
  const filters: FilterItem[] = [
    { value: "All", label: "All" },
    ...limitedBase,
    ...genderFilters,
  ].slice(0, 10);

  // Map labels to the same images you use on Home
  const categoryImages: Record<string, string | undefined> = {
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
  const getImageForLabel = (label: string) =>
    categoryImages[label] ??
    `/category/${label.toLowerCase().replace(/\s+/g, "-")}-cat.jpg`;

  const scrollBelowHero = () => {
    if (heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  };
  const scrollToHeader = () => {
    headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // read query params
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
      setActiveCategory(category);
      setGenderFilter(null);
    }

    resetCount();
    if (scroll === "true") setTimeout(scrollBelowHero, 0);
  }, [router.isReady]);

  // when filters change, reset and keep the sticky bar in view
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    resetCount();
    scrollToHeader();
  }, [activeCategory, genderFilter]);

  const handleLoadMore = () => setVisibleCount((prev) => prev + 4);

  // apply filters
  const filteredByGender = genderFilter
    ? products.filter((p) => p.gender === genderFilter)
    : products;
  const filteredProducts = filteredByGender.filter((p) =>
    activeCategory === "All" ? true : p.category === activeCategory
  );

  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more.";

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

      {/* 💎 Category Header (sticky) */}
      <section
        ref={headerRef}
        className="pt-6 pb-6 px-4 sm:px-6 max-w-7xl mx-auto sticky top-14 z-30 
                   bg-[var(--bg-page)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-page)]/70"
        style={{ scrollMarginTop: "40px" }}
      >
        <div className="text-center mb-4">
          <h2
            ref={titleRef}
            className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug"
          >
            {genderFilter === "him"
              ? "For Him"
              : genderFilter === "her"
              ? "For Her"
              : activeCategory === "All"
              ? "Our Jewelry"
              : formatCategory(activeCategory)}
          </h2>
        </div>

        {/* 📱 Mobile: swipe row of BIG photo tiles */}
        <div className="md:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]">
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {filters.map((f) => {
            const active =
              (!!f.isGender &&
                f.value === "for-him" &&
                genderFilter === "him" &&
                activeCategory === "All") ||
              (!!f.isGender &&
                f.value === "for-her" &&
                genderFilter === "her" &&
                activeCategory === "All") ||
              (!f.isGender && activeCategory === f.value && !genderFilter) ||
              (f.value === "All" && activeCategory === "All" && !genderFilter);

            const imgSrc =
              f.value === "All" ? undefined : getImageForLabel(f.label);

            return (
              <div
                key={`m-${f.value}`}
                className="snap-start flex-shrink-0 w-48"
              >
                <CategoryTile
                  name={f.label}
                  src={imgSrc}
                  active={!!active}
                  onClick={() => {
                    if (f.value === "for-him") {
                      setGenderFilter("him");
                      setActiveCategory("All");
                    } else if (f.value === "for-her") {
                      setGenderFilter("her");
                      setActiveCategory("All");
                    } else if (f.value === "All") {
                      setGenderFilter(null);
                      setActiveCategory("All");
                    } else {
                      setGenderFilter(null);
                      setActiveCategory(f.value);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 🖥️ Desktop: one horizontal line (no wrap), 10 evenly-sized tiles */}
        <div className="hidden md:flex flex-nowrap items-stretch gap-3">
          {filters.slice(0, 10).map((f) => {
            const active =
              (!!f.isGender &&
                f.value === "for-him" &&
                genderFilter === "him" &&
                activeCategory === "All") ||
              (!!f.isGender &&
                f.value === "for-her" &&
                genderFilter === "her" &&
                activeCategory === "All") ||
              (!f.isGender && activeCategory === f.value && !genderFilter) ||
              (f.value === "All" && activeCategory === "All" && !genderFilter);

            const imgSrc =
              f.value === "All" ? undefined : getImageForLabel(f.label);

            return (
              <div
                key={`d-${f.value}`}
                className="min-w-0 flex-1" // <= makes all 10 share row width evenly
              >
                <CategoryTile
                  name={f.label}
                  src={imgSrc}
                  active={!!active}
                  onClick={() => {
                    if (f.value === "for-him") {
                      setGenderFilter("him");
                      setActiveCategory("All");
                    } else if (f.value === "for-her") {
                      setGenderFilter("her");
                      setActiveCategory("All");
                    } else if (f.value === "All") {
                      setGenderFilter(null);
                      setActiveCategory("All");
                    } else {
                      setGenderFilter(null);
                      setActiveCategory(f.value);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 🛒 Product Grid (unchanged size to match Home) */}
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
                    ? {
                        pathname: `/category/${product.category}/${product.slug}`,
                        query: { gender: genderFilter },
                      }
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
                    router.push(
                      `/category/${product.category}/${product.slug}`
                    );
                    return;
                  }
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    discountedPrice: product.salePrice,
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
              onClick={handleLoadMore}
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

// 🧠 Server-side data loader
export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const client = await clientPromise;
  let genderQuery: "him" | "her" | undefined;
  if (query.category === "for-him") genderQuery = "him";
  if (query.category === "for-her") genderQuery = "her";
  const filter = genderQuery ? { gender: genderQuery } : {};
  const productsRaw = await client
    .db()
    .collection("products")
    .find(filter)
    .toArray();
  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image,
    category: p.category,
    gender: p.gender || "unisex",
    description: p.description || "",
  }));
  return { props: { products } };
};
