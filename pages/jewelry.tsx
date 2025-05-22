// 📄 pages/jewelry.tsx – Unified Scroll Logic 💎 (Home + Filters behave exactly the same)

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
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ✅ Track scroll trigger and category in sync
  const scrollTriggered = useRef(false);

  useEffect(() => {
    const queryCategory = router.query.category;
    const shouldScroll = router.query.scroll === "true";

    if (typeof queryCategory === "string") {
      setFilteredCategory(queryCategory.toLowerCase());
      scrollTriggered.current = shouldScroll;
    } else {
      setFilteredCategory(null);
    }
  }, [router.query.category, router.query.scroll]);

  useEffect(() => {
    // 🔁 This fires only after filteredCategory is set
    if (!scrollTriggered.current || !filteredCategory) return;

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (headerRef.current) {
          const headerY =
            headerRef.current.getBoundingClientRect().top + window.pageYOffset;
          const navEl = document.querySelector("nav");
          const navHeight = navEl ? navEl.clientHeight : 0;

          window.scrollTo({
            top: headerY - navHeight - 60,
            behavior: "smooth",
          });

          // ✅ Clear scroll flag and clean URL
          scrollTriggered.current = false;
          router.replace(
            {
              pathname: "/jewelry",
              query: { category: router.query.category },
            },
            undefined,
            { shallow: true }
          );
        }
      }, 300);
    });
  }, [filteredCategory]);

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
      if (headerRef.current) {
        const headerY =
          headerRef.current.getBoundingClientRect().top + window.pageYOffset;
        const navEl = document.querySelector("nav");
        const navHeight = navEl ? navEl.clientHeight : 0;
        window.scrollTo({
          top: headerY - navHeight - 60,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const pageTitle = filteredCategory
    ? `${filteredCategory
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())} | Classy Diamonds`
    : "Jewelry Collection | Classy Diamonds";
  const pageDescription = filteredCategory
    ? `Explore fine ${filteredCategory.replace(
        /-/g,
        " "
      )} from Classy Diamonds. Beautiful, handcrafted pieces for every moment.`
    : "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more, crafted with passion at Classy Diamonds.";

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
          <h1 className="text-3xl md:text-6xl font-bold mb-6 text-[#e0e0e0]">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto text-[#e0e0e0]">
            Discover timeless pieces designed to capture every moment, crafted
            with passion and precision.
          </p>
        </div>
      </section>

      {/* 💎 Jewelry Grid Section */}
      <section className="pt-32 pb-16 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div ref={headerRef}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4 sm:mb-6">
            {filteredCategory
              ? filteredCategory
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())
              : "Our Jewelry"}
          </h2>
          <p className="text-center text-[#cfd2d6] max-w-2xl mx-auto mb-12 text-base sm:text-lg">
            Browse our exclusive collection of fine jewelry, meticulously
            crafted to celebrate life's most treasured moments.
          </p>

          {/* 🧭 Filter Buttons */}
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
          {filteredProducts.slice(0, visibleCount).map((product, index) => (
            <div key={product.id} className="group hover:cursor-pointer">
              <div className="bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300 flex flex-col h-full">
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
