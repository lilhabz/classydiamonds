// 📄 pages/category/[category].tsx – Optimized for Performance, A11Y, SEO, Mobile 💎

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

  // 🧭 Control which image goes with which category
  const categoryHeroImages: { [key: string]: string } = {
    rings: "/category-hero/ring-hero.jpg",
    bracelets: "/category-hero/bracelet-hero.jpg",
    earrings: "/category-hero/earring-hero.jpg",
    "wedding-bands": "/category-hero/wedding-band-hero.jpg",
    "engagement-rings": "/category-hero/engagement-ring-hero.jpg",
    necklaces: "/category-hero/necklace-hero.jpg",
  };

  const heroImage = categoryHeroImages[category?.toLowerCase()] || null;

  const filteredProducts = jewelryData.filter((product) =>
    product.slug.includes(category?.toLowerCase().replace(/-/g, " "))
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
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>{prettyCategory} | Classy Diamonds</title>
        <meta
          name="description"
          content={`Explore our stunning collection of ${prettyCategory} at Classy Diamonds.`}
        />
      </Head>

      {/* 🌟 Hero Section - Dynamic per category */}
      {heroImage && (
        <section className="relative w-full h-[40vh] sm:h-[50vh] overflow-hidden">
          <Image
            src={heroImage}
            alt={`${prettyCategory} category banner`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <h1 className="text-3xl sm:text-5xl font-bold text-white capitalize">
              {prettyCategory}
            </h1>
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
              <div className="bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:ring-2 hover:ring-white hover:scale-105 transition-transform duration-300 flex flex-col h-full">
                <Link
                  href={`/product/${product.slug}`}
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
                    className="w-full px-6 py-3 bg-white text-[#1f2a44] rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:bg-gray-200 cursor-pointer"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 🔽 Smooth Scroll Anchor */}
        <div ref={productsEndRef} />

        {/* ➕ Load More or No More */}
        {visibleCount < filteredProducts.length ? (
          <div className="flex justify-center mt-12">
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-lg hover:bg-white hover:scale-105 transition-transform"
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
