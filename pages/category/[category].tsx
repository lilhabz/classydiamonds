// 📄 pages/category/[category].tsx - Dynamic Category Page

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

      {/* 🌟 Hero Section */}
      <section className="-mt-20 relative w-full h-[60vh] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={`/category/${category}-hero.jpg`}
            alt={`${prettyCategory} Hero`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black opacity-50" />
        </div>

        <div className="relative z-10 px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {prettyCategory}
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-[#cfd2d6]">
            Browse our handpicked selection of {prettyCategory?.toLowerCase()},
            crafted to elevate your style.
          </p>
        </div>
      </section>

      {/* 💍 Product Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-12">
          {prettyCategory} Pieces
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div key={product.id} className="group hover:cursor-pointer">
              <div className="bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300 flex flex-col h-full">
                <Link href={`/product/${product.slug}`} className="flex-1">
                  <div className="w-full h-48 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={500}
                      height={500}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="text-xl font-semibold text-[#cfd2d6] group-hover:text-white transition-colors duration-300">
                      {product.name}
                    </h3>
                    <p className="mt-2 text-gray-400 group-hover:text-white transition-colors duration-300">
                      ${product.price.toLocaleString()}
                    </p>
                  </div>
                </Link>

                <div className="p-6 pt-0">
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
                    className="w-full px-6 py-3 bg-white text-[#1f2a44] rounded-xl font-semibold transition-all duration-300 transform hover:scale-110 hover:bg-gray-200 hover:font-bold cursor-pointer"
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
              onClick={handleLoadMore}
              className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-lg hover:bg-white hover:scale-105 transition-transform duration-300"
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
// 📄 pages/category/[category].tsx
