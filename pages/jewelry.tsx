// 📄 pages/jewelry.tsx – Now with Category Filtering via URL Param + Buttons 💎

"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { jewelryData } from "@/data/jewelryData";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";

export default function JewelryPage() {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null);
  const productsEndRef = useRef<HTMLDivElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const queryCategory = router.query.category;
    if (typeof queryCategory === "string") {
      setFilteredCategory(queryCategory.toLowerCase());
    } else {
      setFilteredCategory(null);
    }
  }, [router.query.category]);

  const filteredProducts = filteredCategory
    ? jewelryData.filter((p) => p.category.toLowerCase() === filteredCategory)
    : jewelryData;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 4);
    setTimeout(() => {
      productsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  const handleFilter = (cat: string | null) => {
    setFilteredCategory(cat);
    router.push(cat ? `/jewelry?category=${cat}` : "/jewelry", undefined, {
      shallow: true,
    });
    setTimeout(() => {
      productGridRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>Jewelry Collection | Classy Diamonds</title>
        <meta
          name="description"
          content="Explore timeless engagement rings, wedding bands, necklaces, earrings, and more, crafted with passion at Classy Diamonds."
        />
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
          <h1 className="text-3xl md:text-6xl font-bold mb-6 text-[#e0e0e0]">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto text-[#e0e0e0]">
            Discover timeless pieces designed to capture every moment, crafted
            with passion and precision.
          </p>
        </div>
      </section>

      {/* 🧭 Filter Buttons */}
      <section className="pt-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {[
            "All",
            "Engagement",
            "Wedding Bands",
            "Rings",
            "Bracelets",
            "Necklaces",
            "Earrings",
          ].map((cat) => (
            <button
              key={cat}
              onClick={() =>
                handleFilter(
                  cat === "All" ? null : cat.toLowerCase().replace(/\s+/g, "-")
                )
              }
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                filteredCategory ===
                (cat === "All" ? null : cat.toLowerCase().replace(/\s+/g, "-"))
                  ? "bg-white text-[#1f2a44]"
                  : "bg-[#25304f] text-white hover:bg-[#2f3b5e]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 💎 Jewelry Grid */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
          Our Jewelry
        </h2>

        <p className="text-center text-[#cfd2d6] max-w-2xl mx-auto mb-12 sm:mb-16 text-base sm:text-lg">
          Browse our exclusive collection of fine jewelry, meticulously crafted
          to celebrate life's most treasured moments.
        </p>

        <div
          ref={productGridRef}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6"
        >
          {filteredProducts.slice(0, visibleCount).map((product, index) => (
            <div key={product.id} className="group hover:cursor-pointer">
              <div className="bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300 flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                  <Link
                    href={`/category/${product.category}/${product.slug}`}
                    className="flex-1"
                  >
                    <div className="w-full h-44 sm:h-48 overflow-hidden relative">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        priority={index < 4}
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    <div className="p-4 text-center">
                      <h3 className="text-lg sm:text-xl font-semibold text-[#cfd2d6] group-hover:text-white transition-colors duration-300">
                        {product.name}
                      </h3>
                      <p className="mt-2 text-gray-400 group-hover:text-white transition-colors duration-300">
                        ${product.price.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </div>

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

        <div ref={productsEndRef} />

        {visibleCount < filteredProducts.length ? (
          <div className="flex justify-center mt-12">
            <button
              onClick={handleLoadMore}
              className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-base sm:text-lg hover:bg-white hover:scale-105 transition-transform duration-300"
            >
              Load More
            </button>
          </div>
        ) : (
          <div className="text-center mt-12 text-base sm:text-lg text-gray-400">
            🎉 You've seen all our beautiful jewelry!
            <div className="mt-6">
              <Link href="/custom">
                <button className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-base sm:text-lg hover:bg-white hover:scale-105 transition-transform duration-300">
                  Create Your Own Piece
                </button>
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
