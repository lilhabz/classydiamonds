// 📄 pages/jewelry.tsx – Shop Page (pulls all products from MongoDB) 📦

"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import { GetServerSideProps } from "next";

// 🔢 Product type from database, including string ID for cart
export type ProductType = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string; // URL from Cloudinary or public/uploads
  category: string;
  description?: string;
};

export default function JewelryPage({ products }: { products: ProductType[] }) {
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
    if (typeof category === "string") setFilteredCategory(category);
    else setFilteredCategory(null);
    scrollTriggered.current = scroll === "true";
  }, [router.query]);

  // 🏃‍♂️ Handle auto-scroll whenever flagged
  useEffect(() => {
    if (!scrollTriggered.current) return;
    setTimeout(() => {
      if (!headerRef.current) return;
      const headerY =
        headerRef.current.getBoundingClientRect().top + window.pageYOffset;
      const navHeight = document.querySelector("header")?.clientHeight ?? 0;
      window.scrollTo({ top: headerY - navHeight - 60, behavior: "smooth" });
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

  // 🔄 Filter the data
  const filteredProducts = filteredCategory
    ? products.filter((p) => p.category.toLowerCase() === filteredCategory)
    : products;

  // ➕ Load more handler
  const handleLoadMore = () => setVisibleCount((prev) => prev + 4);

  // 🔘 Filter handler: always include scroll flag
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
            priority
            sizes="100vw"
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

      {/* 💎 Grid & Filters */}
      <section className="pt-32 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div ref={headerRef}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-6 text-[var(--foreground)]">
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
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
                    filteredCategory === slug
                      ? "bg-white text-[var(--bg-nav)]"
                      : "bg-[var(--bg-nav)] text-[var(--foreground)] hover:bg-[#2f3b5e]"
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
              key={product.slug}
              className="group bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col h-full"
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
              {/* ✨ Pop-out Add to Cart Button */}
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
                className="m-4 px-4 py-2 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold hover:bg-gray-100 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer"
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
              className="px-8 py-4 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-full cursor-pointer"
            >
              Load More
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// 📤 Server-side data fetching – loads all products from MongoDB
export const getServerSideProps: GetServerSideProps = async () => {
  const client = await clientPromise;
  const productsRaw = await client.db().collection("products").find().toArray();
  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.imageUrl || p.image, // support static & uploaded images
    category: p.category,
    description: p.description || "",
  }));
  return { props: { products } };
};
