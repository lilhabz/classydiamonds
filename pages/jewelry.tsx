// 📄 pages/jewelry.tsx – Shop Page with Auto-Scrolling Mobile Icon Filters 📦

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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const iconsContainerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const router = useRouter();
  const scrollTriggered = useRef(false);

  const mobileCategories = [
    { name: "All", slug: "all", icon: "/icons/jewellery.svg" },
    { name: "Engagement", slug: "engagement", icon: "/icons/wedding-ring.svg" },
    {
      name: "Wedding Bands",
      slug: "wedding-bands",
      icon: "/icons/wedding-bands.svg",
    },
    { name: "Rings", slug: "rings", icon: "/icons/rings.svg" },
    { name: "Bracelets", slug: "bracelets", icon: "/icons/bracelets.svg" },
    { name: "Necklaces", slug: "necklaces", icon: "/icons/necklaces.svg" },
    { name: "Earrings", slug: "earrings", icon: "/icons/earrings.svg" },
  ];

  // Sync URL query to state & reset load-more
  useEffect(() => {
    const { category, scroll } = router.query;
    if (typeof category === "string") setFilteredCategory(category);
    else setFilteredCategory(null);
    scrollTriggered.current = scroll === "true";
    setVisibleCount(8);
  }, [router.query]);

  // Auto-scroll page to title when triggered
  useEffect(() => {
    if (!scrollTriggered.current) return;
    setTimeout(() => {
      if (titleRef.current) {
        const y =
          titleRef.current.getBoundingClientRect().top + window.pageYOffset;
        const navH = document.querySelector("header")?.clientHeight ?? 0;
        window.scrollTo({ top: y - navH - 20, behavior: "smooth" });
      }
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

  // Auto-scroll container to center the active icon
  useEffect(() => {
    if (!iconsContainerRef.current || filteredCategory === null) return;
    const btn = iconRefs.current[filteredCategory];
    const container = iconsContainerRef.current;
    if (btn) {
      const btnRect = btn.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      // Calculate offset so the btn is centered
      const offset =
        btnRect.left - contRect.left - contRect.width / 2 + btnRect.width / 2;
      container.scrollBy({ left: offset, behavior: "smooth" });
    }
  }, [filteredCategory]);

  const filteredProducts =
    filteredCategory && filteredCategory !== "all"
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

  const pageTitle =
    filteredCategory && filteredCategory !== "all"
      ? `${filteredCategory
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())} | Classy Diamonds`
      : "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    filteredCategory && filteredCategory !== "all"
      ? `Explore fine ${filteredCategory.replace(
          /-/g,
          " "
        )} from Classy Diamonds.`
      : "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more.";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* 🌟 Hero */}
      <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/hero-jewelry.jpg"
          alt="Jewelry Hero"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-6xl font-bold mb-4 text-[var(--foreground)]">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto text-[var(--foreground)]">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>



      {/* 💎 Title & Desktop Filters */}
      <section className="pt-16 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2
          ref={titleRef}
          className="text-2xl sm:text-3xl font-semibold text-center mb-4"
        >
          {filteredCategory && filteredCategory !== "all"
            ? filteredCategory
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())
            : "Our Jewelry"}
        </h2>
        <div className="hidden sm:flex flex-wrap gap-3 justify-center mb-8">
          {[
            "All",
            "Engagement",
            "Wedding Bands",
            "Rings",
            "Bracelets",
            "Necklaces",
            "Earrings",
          ].map((catName) => {
            const slug = catName.toLowerCase().replace(/\s+/g, "-");
            const active = (filteredCategory || "all") === slug;
            return (
              <button
                key={catName}
                onClick={() => handleFilter(slug)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                  active
                    ? "bg-white text-[var(--bg-nav)]"
                    : "bg-[var(--bg-nav)] text-[var(--foreground)] hover:bg-[#2f3b5e]"
                }`}
              >
                {catName}
              </button>
            );
          })}
        </div>
      </section>

      {/* 🛍️ Mobile-Only Icon Filters */}
      <section className="sm:hidden px-4 mt-4 mb-8">
        <div ref={iconsContainerRef} className="overflow-x-auto">
          <div className="flex space-x-6 w-max py-2 px-2">
            {mobileCategories.map((cat) => {
              const active = (filteredCategory || "all") === cat.slug;
              return (
                <button
                  key={cat.name}
                  ref={(el) => {
                    iconRefs.current[cat.slug!] = el;
                  }}
                  onClick={() => handleFilter(cat.slug)}
                  className={`flex-shrink-0 text-center p-2 rounded-lg ${
                    active ? "bg-black/60" : ""
                  }`}
                  aria-label={cat.name}
                >
                  <img src={cat.icon} alt="" className="w-16 h-16 mx-auto" />
                  <p
                    className={`mt-2 text-sm text-white ${
                      active ? "font-semibold" : ""
                    }`}
                  >
                    {cat.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 📦 Products & Load More */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-16">
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
                className="m-4 px-4 py-2 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold hover:bg-gray-100 hover:scale-105 hover:shadow-2xl transition"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>

        {visibleCount < filteredProducts.length && (
          <div className="flex justify-center">
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

// Server-side data fetching
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
