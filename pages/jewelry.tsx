// 📄 pages/jewelry.tsx – FULL ORIGINAL + Scroll-Fix & Comments 💎

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

// 🔖 Type for each product
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

export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();

  // 🔢 State for “Load More”
  const [visibleCount, setVisibleCount] = useState(8);

  // 🎯 Currently selected category
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // 📌 Ref to the hero section for scroll calculations
  const heroRef = useRef<HTMLDivElement>(null);

  // ➕ Reset visibleCount to default
  const resetCount = () => setVisibleCount(8);

  // 🚚 Scroll just below the hero, accounting for navbar height
  const scrollBelowHero = () => {
    const navHeight =
      document.querySelector("header")?.getBoundingClientRect().height || 0;
    if (heroRef.current) {
      const offset =
        heroRef.current.offsetTop + heroRef.current.offsetHeight - navHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  };

  // 🔄 Router-based initial filter + scroll
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    const { category, gender, scroll } = router.query;

    // 🏷️ Determine activeCategory from query
    if (typeof category === "string" && category) {
      setActiveCategory(category);
    } else if (gender === "him") {
      setActiveCategory("for-him");
    } else if (gender === "her") {
      setActiveCategory("for-her");
    }

    // 🔄 Reset count on filter change
    resetCount();

    // 🚚 If scroll=true OR gender filter, scroll on load
    if (scroll === "true" || typeof gender === "string") {
      setTimeout(scrollBelowHero, 0);
    }
  }, [
    router.isReady,
    router.query.category,
    router.query.gender,
    router.query.scroll,
  ]);

  // 🔄 On every subsequent activeCategory change (via button), scroll
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    resetCount();
    scrollBelowHero();
  }, [activeCategory]);

  // 🧮 Build category list
  const allCategories = Array.from(new Set(products.map((p) => p.category)));
  const categoryFilters = ["All", ...allCategories, "for-him", "for-her"];

  // 🎨 Prettify slug strings
  const formatCategory = (cat: string) =>
    cat.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  // 📋 Filter products
  const filteredProducts =
    activeCategory === "for-him"
      ? products.filter((p) => p.gender === "him")
      : activeCategory === "for-her"
      ? products.filter((p) => p.gender === "her")
      : activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  // 🛒 “Load More” handler
  const handleLoadMore = () => setVisibleCount((prev) => prev + 4);

  // 🔖 SEO metadata
  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more.";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      {/* 🔖 Head Meta */}
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* 🌟 Hero Section */}
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
          <h1 className="text-3xl md:text-6xl font-bold mb-4">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>

      {/* 🧭 Breadcrumbs Section */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
        <Breadcrumbs />
      </div>

      {/* 💎 Category Header Section */}
      <section className="pt-16 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center">
          {activeCategory === "for-him"
            ? "For Him"
            : activeCategory === "for-her"
            ? "For Her"
            : activeCategory === "All"
            ? "Our Jewelry"
            : formatCategory(activeCategory)}
        </h2>

        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {categoryFilters.map((cat) => {
            const label = formatCategory(cat);
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  // 🚀 Navigate and scroll just like shop‐by‐category links
                  router.push(
                    {
                      pathname: "/jewelry",
                      query: { category: cat, scroll: "true" },
                    },
                    undefined,
                    { shallow: true }
                  );
                  setActiveCategory(cat);
                }}
                className={`px-4 py-2 rounded-full font-semibold transition-transform hover:scale-105 ${
                  isActive
                    ? "bg-[var(--foreground)] text-[var(--bg-nav)]"
                    : "bg-[var(--bg-nav)] text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 🛒 Product Grid Section */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 auto-rows-fr">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              className="group bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition flex flex-col h-full justify-between"
            >
              <Link
                href={`/category/${product.category}/${product.slug}?scroll=true`}
                className="flex-1 flex flex-col h-full"
              >
                <div className="relative w-full aspect-square">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition"
                  />
                </div>
                <div className="p-4 text-center flex-1 flex flex-col justify-between">
                  <h3 className="font-semibold truncate text-sm">
                    {product.name}
                  </h3>
                  <p className="text-[#cfd2d6] text-sm">
                    {product.salePrice ? (
                      <>
                        <span className="line-through mr-1">
                          ${product.price.toLocaleString()}
                        </span>
                        <span className="text-red-500">
                          ${product.salePrice.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>${product.price.toLocaleString()}</>
                    )}
                  </p>
                </div>
              </Link>

              {/* ➕ Add to Cart button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
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
