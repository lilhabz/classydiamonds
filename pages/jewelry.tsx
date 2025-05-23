// 📄 pages/jewelry.tsx – Unified Scroll Logic 💎

"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { jewelryData } from "@/data/jewelryData";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";

export default function JewelryPage() {
  // 🛒 Cart context
  const { addToCart } = useCart();

  // 🔢 Load-more count
  const [visibleCount, setVisibleCount] = useState(8);

  // 🔍 Active category slug
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null);

  // 📌 Ref to the category header
  const headerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  // 🚩 Track whether we should auto-scroll
  const scrollTriggered = useRef(false);

  // 🛠 Sync category & scroll flag on query changes
  useEffect(() => {
    const { category, scroll } = router.query;
    if (typeof category === "string") {
      setFilteredCategory(category);
      scrollTriggered.current = scroll === "true";
    } else {
      setFilteredCategory(null);
    }
  }, [router.query]);

  // 🏃‍♂️ When flagged, scroll down to the header, then clear the flag & URL
  useEffect(() => {
    if (!filteredCategory || !scrollTriggered.current) return;

    const id = setTimeout(() => {
      if (!headerRef.current) return;
      const headerY =
        headerRef.current.getBoundingClientRect().top + window.pageYOffset;
      const navHeight = document.querySelector("header")?.clientHeight ?? 0;

      window.scrollTo({
        top: headerY - navHeight - 60, // adjust as needed
        behavior: "smooth",
      });

      scrollTriggered.current = false;
      // remove `scroll` param for a clean URL
      router.replace(
        {
          pathname: "/jewelry",
          query: { category: filteredCategory },
        },
        undefined,
        { shallow: true }
      );
    }, 100);

    return () => clearTimeout(id);
  }, [filteredCategory]);

  // 🔄 Filter the data
  const filteredProducts = filteredCategory
    ? jewelryData.filter((p) => p.category.toLowerCase() === filteredCategory)
    : jewelryData;

  // ➕ Load more handler
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 4);
  };

  // 🔘 Updated filter handler: remove scroll param for "All"
  const handleFilter = (slug: string | null) => {
    if (slug === null) {
      // 🔄 Reset to "All" (no query params)
      router.push({ pathname: "/jewelry", query: {} }, undefined, {
        shallow: true,
      });
    } else {
      // 🔘 Filter specific category with scroll
      router.push(
        {
          pathname: "/jewelry",
          query: { category: slug, scroll: "true" },
        },
        undefined,
        { shallow: true }
      );
    }
  };

  // 📝 SEO metadata
  const pageTitle = filteredCategory
    ? `${filteredCategory
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())} | Classy Diamonds`
    : "Jewelry Collection | Classy Diamonds";
  const pageDescription = filteredCategory
    ? `Explore fine ${filteredCategory.replace(
        /-/g,
        " "
      )} from Classy Diamonds.`
    : "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more.";

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* 🌟 Hero Section */}
      <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero-jewelry.jpg"
            alt="Jewelry Hero Background"
            fill
            priority
            sizes="100vw"
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-black opacity-50 pointer-events-none" />
        </div>
        <div className="relative z-10 px-4">
          <h1 className="text-3xl md:text-6xl font-bold mb-6">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>

      {/* 💎 Grid & Filters */}
      <section className="pt-32 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* 📍 The header we scroll to */}
        <div ref={headerRef}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-6">
            {filteredCategory
              ? filteredCategory
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())
              : "Our Jewelry"}
          </h2>
          <p className="text-center text-[#cfd2d6] mb-12">
            Browse our exclusive collection.
          </p>

          {/* 🧭 Category Buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-16">
            {[
              "All",
              "Engagement",
              "Wedding Bands",
              "Rings",
              "Bracelets",
              "Necklaces",
              "Earrings",
            ].map((cat) => {
              const slug =
                cat === "All" ? null : cat.toLowerCase().replace(/\s+/g, "-");
              return (
                <button
                  key={cat}
                  onClick={() => handleFilter(slug)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                    filteredCategory === slug
                      ? "bg-white text-[#1f2a44]"
                      : "bg-[#25304f] text-white hover:bg-[#2f3b5e]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* 🖼️ Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col h-full"
            >
              <Link href={`/category/${product.category}/${product.slug}`}>
                <div className="w-full h-44 sm:h-48 relative">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition"
                  />
                </div>
                <div className="p-4 text-center flex-1 flex flex-col justify-between">
                  <h3 className="font-semibold text-[#e0e0e0]">
                    {product.name}
                  </h3>
                  <p className="text-[#cfd2d6]">
                    ${product.price.toLocaleString()}
                  </p>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  addToCart({ ...product, quantity: 1 });
                }}
                className="m-4 px-4 py-2 bg-white text-[#1f2a44] rounded"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>

        {/* ➕ Load More */}
        {visibleCount < filteredProducts.length && (
          <div className="flex justify-center mt-12">
            <button
              onClick={handleLoadMore}
              className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full"
            >
              Load More
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
