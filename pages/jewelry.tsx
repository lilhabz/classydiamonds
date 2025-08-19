// 📄 pages/jewelry.tsx – 4 categories at top (Rings/Earrings/Bracelets/Necklaces & Pendants) + “All Jewelry” grid ✅💎

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
const isRingCategory = (cat?: string) =>
  (cat ?? "").toLowerCase().includes("ring");

const formatCategory = (cat: string) => {
  // Display override for Necklaces
  if (cat === "Necklaces") return "Necklaces & Pendants";
  return cat.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

// Only the four categories we want to show
const FIXED_CATEGORIES = [
  "Rings",
  "Earrings",
  "Bracelets",
  "Necklaces",
] as const;

const CATEGORY_IMAGES: Record<(typeof FIXED_CATEGORIES)[number], string> = {
  Rings: "/category/ring-cat.jpg",
  Earrings: "/category/earring-cat.jpg",
  Bracelets: "/category/bracelet-cat.jpg",
  Necklaces: "/category/necklace-cat.jpg",
};

const imageFor = (label: (typeof FIXED_CATEGORIES)[number]) =>
  CATEGORY_IMAGES[label];

/* ------------------------------ Category Tile ----------------------------- */
function CategoryTile({
  label,
  img,
  active,
  onClick,
  className,
  textSizeClass,
  aspect = "aspect-[4/3]",
}: {
  label: string;
  img?: string;
  active: boolean;
  onClick: () => void;
  className: string;
  textSizeClass: string;
  aspect?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={[
        "group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 flex-shrink-0 hover:scale-[1.03]",
        active ? "ring-2 ring-white" : "",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500",
        className,
      ].join(" ")}
    >
      <div className={["relative w-full bg-[#25304f]", aspect].join(" ")}>
        {img ? (
          <Image src={img} alt={label} fill className="object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10" />
        <span
          className={[
            "absolute inset-0 flex items-center justify-center z-30 font-semibold text-white text-center px-3",
            "drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]",
            textSizeClass,
          ].join(" ")}
        >
          {label}
        </span>
        <span
          aria-hidden
          className={[
            "pointer-events-none absolute inset-0 rounded-xl z-20",
            active ? "ring-2 ring-white" : "",
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

  // Selection is only for highlighting the active tile; the grid below shows ALL products.
  const [activeCategory, setActiveCategory] = useState<
    (typeof FIXED_CATEGORIES)[number] | null
  >(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const initialMount = useRef(true);
  const router = useRouter();

  const resetCount = () => setVisibleCount(8);
  useEffect(() => {
    resetCount();
  }, []);

  // If a category is provided in the URL (?category=Rings), highlight it.
  useEffect(() => {
    if (!router.isReady) return;
    const { category, scroll } = router.query;

    if (typeof category === "string") {
      // Normalize: allow "necklaces" or "Necklaces"
      const normalized =
        FIXED_CATEGORIES.find(
          (c) => c.toLowerCase() === category.toLowerCase()
        ) ?? null;
      setActiveCategory(normalized);
    }

    resetCount();

    if (scroll === "true" && heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [router.isReady]);

  // Smooth scroll UX when changing the highlighted tile
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    resetCount();
    headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeCategory]);

  // Keep these, even though the grid shows ALL, so it's easy to re-enable filtered sections later.
  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more.";

  // Show product count in the "Load More" logic
  const totalProducts = products.length;

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
        className="pt-6 pb-6 px-0 sm:px-0 w-full"
        style={{ scrollMarginTop: "40px" }}
      >
        <div className="text-center mb-4 px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
            Shop by Category
          </h2>
        </div>

        {/* 📱 Mobile: swipe row (visible scrollbar) */}
        <div className="sm:hidden px-0 mt-2">
          <div
            className="overflow-x-auto show-scrollbar"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
            }}
          >
            <style jsx>{`
              .show-scrollbar::-webkit-scrollbar {
                height: 8px;
              }
              .show-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .show-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.35);
                border-radius: 9999px;
              }
              .show-scrollbar:hover::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.55);
              }
            `}</style>

            <div className="flex gap-3 w-max px-4">
              {FIXED_CATEGORIES.map((key) => {
                const label = formatCategory(key);
                const img = imageFor(key);
                const active = activeCategory === key;

                return (
                  <CategoryTile
                    key={`m-${key}`}
                    label={label}
                    img={img}
                    active={!!active}
                    onClick={() => {
                      setActiveCategory(key);
                      // Keep deep-linking behavior if you want to link ads/email directly
                      router.push(
                        {
                          pathname: "/jewelry",
                          query: { category: key, scroll: "true" },
                        },
                        undefined,
                        { shallow: true }
                      );
                    }}
                    className="w-32"
                    textSizeClass="text-[12px]"
                    aspect="aspect-[4/3]"
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 🖥️ Desktop: single row of 4 tiles */}
        <div className="hidden sm:block w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
          <div className="mx-auto max-w-[1440px] px-2">
            <div className="grid grid-cols-4 gap-[8px]">
              {FIXED_CATEGORIES.map((key) => {
                const label = formatCategory(key);
                const img = imageFor(key);
                const active = activeCategory === key;

                return (
                  <CategoryTile
                    key={`d-${key}`}
                    label={label}
                    img={img}
                    active={!!active}
                    onClick={() => {
                      setActiveCategory(key);
                      router.push(
                        {
                          pathname: "/jewelry",
                          query: { category: key, scroll: "true" },
                        },
                        undefined,
                        { shallow: true }
                      );
                    }}
                    className="w-full"
                    textSizeClass="text-[13px]"
                    aspect="aspect-[5/4]"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 🔽 “All Jewelry” Title */}
      <div className="text-center mt-4 px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
          All Jewelry
        </h2>
      </div>

      {/* 🛒 Product Grid — SHOW ALL PRODUCTS */}
      <section className="mt-8 px-4 sm:px-6 max-w-7xl mx-auto mb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {products.slice(0, visibleCount).map((product) => (
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
    category: p.category || "",
    gender: p.gender || "unisex",
    description: p.description || "",
  }));

  return { props: { products } };
};
