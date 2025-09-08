// 📄 pages/index.tsx – Home Page using ProductCard for Featured (matches Jewelry grid) 💎✅

"use client";

import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import type { GetServerSideProps } from "next";
import clientPromise from "@/lib/mongodb";
import CategoryGrid from "@/components/CategoryGrid";
import ProductCard from "@/components/ProductCard"; // render cards directly with explicit grid

// 🔒 Canonical slugs helper (guards against legacy "necklaces")
const canonicalizeCategory = (raw: string) => {
  const v = String(raw || "").toLowerCase();
  if (v === "necklaces") return "necklaces-pendants";
  return v;
};

interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  category: string; // canonical slug
  slug: string;
}

interface HomeProps {
  products: Product[];
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const client = await clientPromise;
  const db = client.db();
  const featuredDocs = await db
    .collection("products")
    .find({ featured: true })
    .limit(4) // ⬅️ exactly four
    .toArray();

  const products: Product[] = featuredDocs.map((doc: any) => ({
    _id: doc._id.toString(),
    name: doc.name,
    price: doc.price,
    salePrice: doc.salePrice ?? null,
    image: doc.imageUrl || doc.image,
    // ✅ normalize to canonical slugs so links don't break
    category: canonicalizeCategory(String(doc.category || "")),
    slug: doc.slug,
  }));

  return { props: { products } };
};

export default function Home({ products }: HomeProps) {
  const featured = products;

  type Gift = { name: string; image: string };

  // ✅ UPDATED: Route “For Him/Her” to /jewelry with audience filter
  function GiftButton({ gift, index }: { gift: Gift; index: number }) {
    const name = gift.name.trim().toLowerCase();

    let href:
      | string
      | {
          pathname: string;
          query?: Record<string, string>;
        };

    if (name === "for him" || name.includes("for him")) {
      href = { pathname: "/jewelry", query: { audience: "him" } };
    } else if (name === "for her" || name.includes("for her")) {
      href = { pathname: "/jewelry", query: { audience: "her" } };
    } else {
      // fallback (not used here, but keeps component generic)
      const slug = name.replace(/\s+/g, "-");
      href = { pathname: `/category/${slug}`, query: { scroll: "true" } };
    }

    return (
      <Link
        href={href}
        className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer"
      >
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={gift.image}
            alt={gift.name}
            fill
            priority={index < 1}
            className="object-cover rounded-xl group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 z-10" />
          <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-semibold text-white z-20">
            {gift.name}
          </span>
        </div>
      </Link>
    );
  }

  // 🏷️ type label helper (keeps Necklaces singular)
  const typeLabelFromCategory = (cat: string) =>
    cat === "necklaces-pendants"
      ? "Necklace"
      : cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ");

  // 🎯 Featured grid (same column pattern as Jewelry page)
  function FeaturedGrid({ items }: { items: Product[] }) {
    if (items.length === 0) {
      return (
        <p className="text-white text-center w-full">
          No featured items to display.
        </p>
      );
    }
    return (
      <div className="max-w-7xl mx-auto">
        <div
          className="
            grid
            grid-cols-[repeat(2,minmax(var(--card-w),1fr))]
            md:grid-cols-[repeat(3,minmax(var(--card-w),1fr))]
            lg:grid-cols-[repeat(4,minmax(var(--card-w),1fr))]
            gap-4 sm:gap-6
          "
        >
          {items.map((item) => (
            <div key={item._id}>
              <ProductCard
                slug={item.slug}
                image={item.image}
                name={item.name}
                price={item.price}
                salePrice={item.salePrice ?? null}
                href={`/category/${item.category}/${item.slug}?scroll=true`}
                stockLabel="In Stock"
                typeLabel={typeLabelFromCategory(item.category)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ✅ Use canonical slug for Necklaces & Pendants
  const CATEGORY_ITEMS = [
    { label: "Rings", slug: "rings", image: "/category/ring-cat.jpg" },
    { label: "Earrings", slug: "earrings", image: "/category/earring-cat.jpg" },
    {
      label: "Bracelets",
      slug: "bracelets",
      image: "/category/bracelet-cat.jpg",
    },
    {
      label: "Necklaces & Pendants",
      slug: "necklaces-pendants", // ✅ fixed
      image: "/category/necklace-cat.jpg",
    },
  ];

  return (
    <>
      <Head>
        <title>Classy Diamonds - Fine Jewelry</title>
        <meta
          name="description"
          content="Explore elegant rings, earrings, bracelets, and necklaces & pendants."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="flex flex-col min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] overflow-x-hidden">
        {/* ⭐ Hero Section */}
        <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
          <Image
            src="/hero-home.jpg"
            alt="Hero"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 text-center px-4">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold tracking-wider leading-snug text-[#e0e0e0] mb-6">
              Timeless Elegance
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-[#e0e0e0] mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover handcrafted fine jewelry made to be worn and loved.
            </p>
            <Link href={{ pathname: "/jewelry", query: { scroll: "true" } }}>
              <button className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full shadow hover:shadow-lg hover:scale-105 transition">
                Shop Now
              </button>
            </Link>
          </div>
        </section>

        {/* 🛍️ Shared Category Grid */}
        <CategoryGrid
          items={CATEGORY_ITEMS}
          title="Shop by Category"
          fullBleedDesktop
          className="mt-12 md:mt-16"
        />

        {/* 💎 Featured – Mobile (uses same grid recipe as Jewelry) */}
        <section className="sm:hidden px-4 mt-2 mb-8">
          <h2 className="text-2xl font-serif font-semibold tracking-wide mb-4">
            Featured Pieces
          </h2>
          <FeaturedGrid items={featured} />
        </section>

        {/* 💎 Featured – Desktop (same grid recipe, 4-up at lg) */}
        <section className="hidden sm:block py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-serif font-semibold tracking-wide mb-8">
            Featured Pieces
          </h2>
          <FeaturedGrid items={featured} />
        </section>

        {/* 🎁 Gifts for Him & Her */}
        <section className="py-16 sm:py-20 px-4 sm:px-10 w-full">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide text-center mb-12 sm:mb-16">
            Gifts for Him & Her
          </h2>
          <div className="grid grid-cols-2 gap-4 justify-center max-w-2xl mx-auto">
            {[
              { name: "For Him", image: "/category/his-gift-cat.jpg" },
              { name: "For Her", image: "/category/her-gift-cat.jpg" },
            ].map((gift, index) => (
              <GiftButton key={gift.name} gift={gift} index={index} />
            ))}
          </div>
        </section>

        {/* 🛠️ About Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 --bg-page">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold mb-6 sm:mb-8 tracking-wide">
              Craftsmanship You Can Trust
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] leading-relaxed">
              Classy Diamonds was founded on a promise: to create jewelry that
              stands the test of time. Every piece we offer is designed with
              precision, built from premium materials, and backed by a legacy of
              trust. This isn’t just jewelry — it’s generational craftsmanship
              you can count on.
            </p>
          </div>
        </section>

        {/* 💎 Why Choose Us Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 --bg-page">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-8 sm:mb-10 tracking-wide">
              Why Choose Classy Diamonds?
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] leading-relaxed">
              With over 30 years in the jewelry industry, we’ve built our name
              on excellence, independence, and unmatched attention to detail.
              Our clients—from London to Australia—choose us because we deliver
              personal service, ethical sourcing, and timeless beauty in every
              creation.
            </p>
          </div>
        </section>

        {/* ✍️ Custom Jewelry CTA */}
        <section className="--bg-page py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-8 tracking-wide">
              Bring Your Vision to Life
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] mb-8 leading-relaxed">
              Whether you’re imagining a one-of-a-kind engagement ring or
              redesigning a meaningful family heirloom, Ned brings decades of
              expertise to every detail. At Classy Diamonds, custom jewelry
              isn’t just made — it’s imagined with you, for you, and crafted by
              hand with heart.
            </p>
            <Link
              href="/custom"
              className="inline-block mt-4 px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-base sm:text-lg hover:bg:white hover:scale-105 transition-transform duration-300"
            >
              Start Your Custom Piece
            </Link>
          </div>
        </section>

        {/* 🧩 Tailwind Purge Safeguard for Swipe Snap */}
        <div className="hidden hidden-scroll-snap-include" />
      </main>
    </>
  );
}
