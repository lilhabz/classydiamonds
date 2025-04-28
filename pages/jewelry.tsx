// 📄 pages/jewelry.tsx - Jewelry Collection Page

"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext"; // 🛒 Cart context
import { jewelryData } from "@/data/jewelryData"; // 💎 Full jewelry collection
import { useState, useRef } from "react"; // 🧠 Needed for Load More + Smooth Scroll

export default function JewelryPage() {
  const { addToCart } = useCart(); // 🛒 Cart hook

  const [visibleCount, setVisibleCount] = useState(8); // 📦 Show 8 products first
  const productsEndRef = useRef<HTMLDivElement>(null); // 🔽 For smooth scroll

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 4);
    setTimeout(() => {
      productsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300); // 📜 Delay to wait for new items
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>Jewelry Collection | Classy Diamonds</title>
        <meta
          name="description"
          content="Explore timeless engagement rings, wedding bands, necklaces, earrings, and more, crafted with passion at Classy Diamonds."
        />
      </Head>

      <Navbar />

      {/* 🌟 Hero Section */}
      <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/hero-jewelry.jpg"
            alt="Jewelry Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black opacity-50" />
        </div>

        <div className="relative z-10 px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[#e0e0e0]">
            Jewelry Collection
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-[#cfd2d6]">
            Discover timeless pieces designed to capture every moment, crafted
            with passion and precision.
          </p>
        </div>
      </section>

      {/* 🛍️ Shop by Category */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-16">
          Shop by Category
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 text-center">
          {[
            { href: "/engagement-rings", label: "Engagement" },
            { href: "/wedding-bands", label: "Wedding Bands" },
            { href: "/rings", label: "Rings" },
            { href: "/bracelets", label: "Bracelets" },
            { href: "/necklaces", label: "Necklaces" },
            { href: "/earrings", label: "Earrings" },
          ].map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center py-10 text-lg font-semibold text-[#cfd2d6] hover:text-white hover:cursor-pointer"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      {/* 💎 Jewelry Collection */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-12">
          Our Jewelry
        </h2>

        <p className="text-center text-[#cfd2d6] max-w-2xl mx-auto mb-16 text-lg">
          Browse our exclusive collection of fine jewelry, meticulously crafted
          to celebrate life's most treasured moments.
        </p>

        {/* 🛒 Product Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {jewelryData.slice(0, visibleCount).map((product) => (
            <div key={product.id} className="group hover:cursor-pointer">
              <div className="bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300 flex flex-col h-full">
                <div className="flex-1 flex flex-col">
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

        {/* 🔽 Smooth scroll target */}
        <div ref={productsEndRef} />

        {/* ➕ Load More or No More */}
        {visibleCount < jewelryData.length ? (
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
            🎉 You've seen all our beautiful jewelry!
            <div className="mt-6">
              <Link href="/custom">
                <button className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-lg hover:bg-white hover:scale-105 transition-transform duration-300">
                  Create Your Own Piece
                </button>
              </Link>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
