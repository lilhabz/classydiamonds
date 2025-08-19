// 📄 pages/jewelry.tsx – 4 categories at top (Rings/Earrings/Bracelets/Necklaces & Pendants) + “All Jewelry” grid ✅💎

"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import { GetServerSideProps } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryGrid from "@/components/CategoryGrid";

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

/* ------------------------------- Constants -------------------------------- */
const CATEGORY_ITEMS = [
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
] as const;

/* ---------------------------------- Page ---------------------------------- */
export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);

  // Highlighted category (by slug). Grid below still shows ALL products.
  const [activeCategorySlug, setActiveCategorySlug] = useState<
    "rings" | "earrings" | "bracelets" | "necklaces" | null
  >(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const resetCount = () => setVisibleCount(8);
  useEffect(() => {
    resetCount();
  }, []);

  // Read ?category and ?scroll on load/shallow nav
  useEffect(() => {
    if (!router.isReady) return;
    const { category, scroll } = router.query;

    if (typeof category === "string") {
      const slug = category.toLowerCase();
      if (["rings", "earrings", "bracelets", "necklaces"].includes(slug)) {
        setActiveCategorySlug(slug as typeof activeCategorySlug);
      } else {
        setActiveCategorySlug(null);
      }
    } else {
      setActiveCategorySlug(null);
    }

    resetCount();

    if (scroll === "true" && heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [router.isReady, router.query]);

  // On category change, reset count and scroll to header
  useEffect(() => {
    resetCount();
    headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeCategorySlug]);

  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    "Explore timeless rings, earrings, bracelets, and necklaces & pendants.";

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
        <CategoryGrid
          items={CATEGORY_ITEMS as any}
          title="Shop by Category"
          fullBleedDesktop
          activeSlug={activeCategorySlug ?? undefined}
          onSelect={(slug) =>
            setActiveCategorySlug(slug as typeof activeCategorySlug)
          }
        />
      </section>

      {/* 🔽 “All Jewelry” Title */}
      <div className="text-center mt-2 px-4 sm:px-6">
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
