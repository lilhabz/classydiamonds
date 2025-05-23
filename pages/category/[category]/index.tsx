// 📄 pages/category/[category]/index.tsx – Category Product Grid (Final Version) ✅

"use client";

import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/context/CartContext";
import { jewelryData } from "@/data/jewelryData";
import { useState, useRef } from "react";

export default function CategoryPage() {
  const { addToCart } = useCart();
  const { query } = useRouter();
  const category = query.category as string;

  const [visibleCount, setVisibleCount] = useState(8);
  const productsEndRef = useRef<HTMLDivElement>(null);

  const categoryHeroImages: { [key: string]: string } = {
    rings: "/category-hero/ring-hero.jpg",
    bracelets: "/category-hero/bracelet-hero.jpg",
    earrings: "/category-hero/earring-hero.jpg",
    "wedding-bands": "/category-hero/wedding-band-hero.jpg",
    engagement: "/category-hero/engagement-ring-hero.jpg",
    necklaces: "/category-hero/necklace-hero.jpg",
  };

  const categoryImagePosition: { [key: string]: string } = {
    rings: "object-[center_75%]",
    bracelets: "object-center",
    earrings: "object-[center_25%] brightness-275",
    "wedding-bands": "object-center",
    engagement: "object-[center_65%]",
    necklaces: "object-[center_30%]",
  };

  const categoryHeroSubtitles: { [key: string]: string } = {
    rings: "Timeless designs that sparkle forever",
    bracelets: "Refined elegance for every wrist",
    earrings: "Statement pieces that shine bright",
    "wedding-bands": "Symbolizing eternal commitment",
    engagement: "Crafted to capture forever",
    necklaces: "Luxury that completes any look",
  };

  const heroImage = categoryHeroImages[category?.toLowerCase()] || null;
  const heroImageClass =
    categoryImagePosition[category?.toLowerCase()] || "object-center";
  const heroSubtitle = categoryHeroSubtitles[category?.toLowerCase()] || "";

  const filteredProducts = jewelryData.filter(
    (product) => product.category.toLowerCase() === category?.toLowerCase()
  );

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 4);
    setTimeout(() => {
      productsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  const prettyCategory = category
    ?.split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>{prettyCategory} | Classy Diamonds</title>
        <meta
          name="description"
          content={`Explore our stunning collection of ${prettyCategory} at Classy Diamonds.`}
        />
      </Head>

      {/* 🌟 Hero Section */}
      {heroImage && (
        <section className="relative w-full h-[40vh] sm:h-[50vh] overflow-hidden">
          <Image
            src={heroImage}
            alt={`${prettyCategory} category banner`}
            fill
            className={`object-cover ${heroImageClass}`}
            priority
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-3xl sm:text-5xl font-bold text-[var(--foreground)] capitalize">
              {prettyCategory}
            </h1>
            {heroSubtitle && (
              <p className="mt-2 text-base sm:text-lg text-[#e0e0e0] max-w-xl">
                {heroSubtitle}
              </p>
            )}
          </div>
        </section>
      )}

      {/* 💍 Product Grid */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
          {prettyCategory} Pieces
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div key={product.id} className="group">
              <div className="bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-lg hover:ring-2 hover:ring-[var(--foreground)] hover:scale-105 transition-transform duration-300 flex flex-col h-full">
                <Link
                  href={`/category/${product.category}/${product.slug}`}
                  className="flex-1 focus:outline-none"
                >
                  <div className="w-full h-48 relative">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="text-lg font-semibold text-[#cfd2d6] group-hover:text-white">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-gray-400 group-hover:text-white">
                      ${product.price.toLocaleString()}
                    </p>
                  </div>
                </Link>

                <div className="p-6 pt-0">
                  <button
                    type="button"
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
                    className="w-full px-6 py-3 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:bg-gray-200 cursor-pointer"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 🔽 Scroll anchor */}
        <div ref={productsEndRef} />

        {/* ➕ Load More */}
        {visibleCount < filteredProducts.length ? (
          <div className="flex justify-center mt-12">
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-8 py-4 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-full font-semibold text-lg hover:bg-white hover:scale-105 transition-transform"
            >
              Load More
            </button>
          </div>
        ) : (
          <div className="text-center mt-12 text-lg text-gray-400">
            🎉 You’ve explored all our {prettyCategory?.toLowerCase()} pieces!
          </div>
        )}
      </section>
    </div>
  );
}
