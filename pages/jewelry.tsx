// 📄 pages/jewelry.tsx – Shop Page with Mobile Icon Filters & Full Grid 📦

"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import { GetServerSideProps } from "next";

export type ProductType = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
};

export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const scrollTriggered = useRef(false);

  // Sync URL query to state & reset visibleCount
  useEffect(() => {
    const { category, scroll } = router.query;
    if (typeof category === "string") setFilteredCategory(category);
    else setFilteredCategory(null);
    scrollTriggered.current = scroll === "true";
    setVisibleCount(8);
  }, [router.query]);

  // Auto-scroll to header when triggered
  useEffect(() => {
    if (!scrollTriggered.current) return;
    setTimeout(() => {
      if (!headerRef.current) return;
      const y =
        headerRef.current.getBoundingClientRect().top + window.pageYOffset;
      const navH = document.querySelector("header")?.clientHeight ?? 0;
      window.scrollTo({ top: y - navH - 60, behavior: "smooth" });
      scrollTriggered.current = false;
      router.replace(
        {
          pathname: "/jewelry",
          query: filteredCategory ? { category: filteredCategory } : {},
        },
        undefined,
        { shallow: true }
      );
    }, 100);
  }, [filteredCategory]);

  const filteredProducts = filteredCategory
    ? products.filter((p) => p.category.toLowerCase() === filteredCategory)
    : products;

  const handleLoadMore = () => setVisibleCount((prev) => prev + 4);

  const handleFilter = (slug: string | null) => {
    router.push(
      {
        pathname: "/jewelry",
        query: slug ? { category: slug, scroll: "true" } : { scroll: "true" },
      },
      undefined,
      { shallow: true }
    );
  };

  const categories = [
    { name: "All", icon: "/icons/jewelry.svg" },
    { name: "Engagement", icon: "/icons/wedding-ring.svg" },
    { name: "Wedding Bands", icon: "/icons/wedding-bands.svg" },
    { name: "Rings", icon: "/icons/rings.svg" },
    { name: "Bracelets", icon: "/icons/bracelets.svg" },
    { name: "Necklaces", icon: "/icons/necklaces.svg" },
    { name: "Earrings", icon: "/icons/earrings.svg" },
  ];

  // SEO
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
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
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-black opacity-50 pointer-events-none" />
        </div>
        <div className="relative z-10 px-4">
          <h1 className="text-3xl md:text-6xl font-bold mb-6 text-[var(--foreground)]">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto text-[var(--foreground)]">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>

      {/* 💎 Filters & Header */}
      <section
        className="pt-32 pb-16 px-4 sm:px-6 max-w-7xl mx-auto"
        ref={headerRef}
      >
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-6">
          {filteredCategory
            ? filteredCategory
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())
            : "Our Jewelry"}
        </h2>

        {/* Mobile: Icon Filters Scroll */}
        <div className="sm:hidden px-4 mb-8">
          <h3 className="text-lg font-semibold text-white text-center mb-2">
            Shop by Category
          </h3>
          <div className="overflow-x-auto">
            <div className="flex space-x-6 w-max py-2">
              {categories.map((cat) => {
                const slug =
                  cat.name === "All"
                    ? null
                    : cat.name.toLowerCase().replace(/\s+/g, "-");
                const active = filteredCategory === slug;
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleFilter(slug)}
                    className="flex-shrink-0 text-center"
                  >
                    <img
                      src={cat.icon}
                      alt={cat.name}
                      className="w-12 h-12 mx-auto mb-1"
                    />
                    <span
                      className={`text-sm ${
                        active ? "text-white font-semibold" : "text-[#cfd2d6]"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop: Button Filters */}
        <div className="hidden sm:flex flex-wrap gap-3 justify-center mb-16">
          {categories.map((cat) => {
            const slug =
              cat.name === "All"
                ? null
                : cat.name.toLowerCase().replace(/\s+/g, "-");
            const active = filteredCategory === slug;
            return (
              <button
                key={cat.name}
                onClick={() => handleFilter(slug)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
                  active
                    ? "bg-white text-[var(--bg-nav)]"
                    : "bg-[var(--bg-nav)] text-[var(--foreground)] hover:bg-[#2f3b5e]"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* 🖼️ Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              className="group bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition flex flex-col h-full"
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
                  <h3 className="font-semibold text-[var(--foreground)]">
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
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: 1,
                  });
                }}
                className="m-4 px-4 py-2 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold hover:bg-gray-100 hover:scale-105 hover:shadow-2xl transition cursor-pointer"
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

// Server-side fetch
export const getServerSideProps: GetServerSideProps = async () => {
  const client = await clientPromise;
  const productsRaw = await client.db().collection("products").find().toArray();
  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.imageUrl || p.image,
    category: p.category,
    description: p.description || "",
  }));
  return { props: { products } };
};
