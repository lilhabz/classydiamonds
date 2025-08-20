// pages/category/[category]/index.tsx
"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import FiltersSidebar from "@/components/FiltersSidebar";
import HeroBanner from "@/components/HeroBanner";
import SubcategoryCards from "@/components/SubcategoryCards";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useCart } from "@/context/CartContext";

/* ------------------------------ Types ------------------------------ */
type Product = {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string; // "rings", "necklaces", etc.
  subcategory?: string; // "halo", "studs", etc.
  metal?: string; // "yellow-gold" | "platinum" ...
  stone?: string; // "diamond" | "lab-grown" | ...
  shape?: string; // "round" | "oval" ...
  carat?: number; // e.g., 1.25
  slug: string;
};

type SubItem = { label: string; slug: string };

type PageProps = {
  categorySlug: string;
  categoryLabel: string;
  subcategories: SubItem[];
  heroImage: string;
  heroSubtitle?: string;
  products: Product[];
};

/* ------------------------- Subcategory & Hero maps ------------------------- */
const CATEGORY_SUBS: Record<string, SubItem[]> = {
  rings: [
    { label: "Engagement Rings", slug: "engagement" },
    { label: "Wedding Bands", slug: "wedding-bands" },
    { label: "Solitaire", slug: "solitaire" },
    { label: "Halo", slug: "halo" },
    { label: "Three-Stone", slug: "three-stone" },
    { label: "Eternity", slug: "eternity" },
    { label: "Men’s Rings", slug: "mens" },
  ],
  earrings: [
    { label: "Studs", slug: "studs" },
    { label: "Hoops", slug: "hoops" },
    { label: "Drops", slug: "drops" },
    { label: "Huggies", slug: "huggies" },
  ],
  bracelets: [
    { label: "Tennis", slug: "tennis" },
    { label: "Bangles", slug: "bangles" },
    { label: "Cuffs", slug: "cuffs" },
    { label: "Chains", slug: "chains" },
  ],
  necklaces: [
    { label: "Pendants", slug: "pendants" },
    { label: "Solitaire", slug: "solitaire" },
    { label: "Station", slug: "station" },
    { label: "Nameplates", slug: "nameplates" },
    { label: "Pearl", slug: "pearl" },
  ],
  engagement: [],
  "wedding-bands": [],
};

const HERO_BY_CATEGORY: Record<string, { image: string; subtitle?: string }> = {
  engagement: {
    image: "/category-hero/engagement-ring-hero.jpg",
    subtitle: "Signature solitaires and brilliant halos.",
  },
  "wedding-bands": {
    image: "/category-hero/wedding-band-hero.jpg",
    subtitle: "Classic, comfort-fit, pavé and more.",
  },
  rings: {
    image: "/category-hero/ring-hero.jpg",
    subtitle: "From timeless designs to bold statements.",
  },
  bracelets: {
    image: "/category-hero/bracelet-hero.jpg",
    subtitle: "Chain, cuff, tennis and more.",
  },
  necklaces: {
    image: "/category-hero/necklace-hero.jpg",
    subtitle: "Minimal to ornate — elevate every neckline.",
  },
  earrings: {
    image: "/category-hero/earring-hero.jpg",
    subtitle: "Studs, hoops, drops and more.",
  },
};

const labelFor = (slug: string) =>
  ((
    {
      engagement: "Engagement",
      "wedding-bands": "Wedding Bands",
      rings: "Rings",
      bracelets: "Bracelets",
      necklaces: "Necklaces",
      earrings: "Earrings",
    } as Record<string, string>
  )[slug] ?? slug);

/* ----------------------------- SERVER DATA ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const categorySlug = String(ctx.params?.category || "").toLowerCase();
  if (!categorySlug) return { notFound: true };

  const categoryLabel = labelFor(categorySlug);

  // read query filters
  const sub =
    typeof ctx.query.sub === "string" ? ctx.query.sub.toLowerCase() : undefined;

  const metal = ctx.query.metal
    ? Array.isArray(ctx.query.metal)
      ? ctx.query.metal.map((m) => String(m).toLowerCase())
      : [String(ctx.query.metal).toLowerCase()]
    : [];

  const stone = ctx.query.stone
    ? Array.isArray(ctx.query.stone)
      ? ctx.query.stone.map((s) => String(s).toLowerCase())
      : [String(ctx.query.stone).toLowerCase()]
    : [];

  const shape = ctx.query.shape
    ? Array.isArray(ctx.query.shape)
      ? ctx.query.shape.map((s) => String(s).toLowerCase())
      : [String(ctx.query.shape).toLowerCase()]
    : [];

  const priceMin = ctx.query.priceMin ? Number(ctx.query.priceMin) : undefined;
  const priceMax = ctx.query.priceMax ? Number(ctx.query.priceMax) : undefined;
  const caratMin = ctx.query.caratMin ? Number(ctx.query.caratMin) : undefined;
  const caratMax = ctx.query.caratMax ? Number(ctx.query.caratMax) : undefined;

  let products: Product[] = [];
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "classydiamonds");

    const q: any = { category: categorySlug };
    if (sub && sub !== "all") q.subcategory = sub;
    if (metal.length) q.metal = { $in: metal };
    if (stone.length) q.stone = { $in: stone };
    if (shape.length) q.shape = { $in: shape };
    if (priceMin !== undefined || priceMax !== undefined) {
      q.price = {};
      if (priceMin !== undefined) q.price.$gte = priceMin;
      if (priceMax !== undefined) q.price.$lte = priceMax;
    }
    if (caratMin !== undefined || caratMax !== undefined) {
      q.carat = {};
      if (caratMin !== undefined) q.carat.$gte = caratMin;
      if (caratMax !== undefined) q.carat.$lte = caratMax;
    }

    const docs = await db
      .collection("products")
      .find(q)
      .project({
        _id: 1,
        name: 1,
        price: 1,
        salePrice: 1,
        image: 1,
        category: 1,
        subcategory: 1,
        metal: 1,
        stone: 1,
        shape: 1,
        carat: 1,
        slug: 1,
      })
      .toArray();

    products = docs.map((d: any) => ({
      _id: String(d._id),
      name: d.name,
      price: d.price,
      salePrice: d.salePrice,
      image: d.image,
      category: (d.category || "").toLowerCase(),
      subcategory: (d.subcategory || d.subCategory || "").toLowerCase(),
      metal: (d.metal || "").toLowerCase(),
      stone: (d.stone || "").toLowerCase(),
      shape: (d.shape || "").toLowerCase(),
      carat: typeof d.carat === "number" ? d.carat : undefined,
      slug: d.slug,
    }));
  } catch (e) {
    // fallback local data (optional)
    products = [];
  }

  const hero = HERO_BY_CATEGORY[categorySlug] ?? {
    image: "/hero-jewelry.jpg",
    subtitle: undefined,
  };

  return {
    props: {
      categorySlug,
      categoryLabel,
      subcategories: CATEGORY_SUBS[categorySlug] || [],
      heroImage: hero.image,
      heroSubtitle: hero.subtitle,
      products,
    },
  };
};

/* ---------------------------------- PAGE --------------------------------- */
export default function CategoryPage({
  categorySlug,
  categoryLabel,
  subcategories,
  heroImage,
  heroSubtitle,
  products,
}: PageProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  // Keep your ?scroll=true behavior
  useEffect(() => {
    const { scroll } = router.query as { scroll?: string };
    if (scroll === "true") {
      const header = document.getElementById("category-header");
      if (!header) return;
      const navOffset = 80;
      const y =
        header.getBoundingClientRect().top + window.scrollY - navOffset - 20;
      requestAnimationFrame(() =>
        window.scrollTo({ top: y, behavior: "smooth" })
      );
      const q = { ...router.query };
      delete (q as any).scroll;
      router.replace({ pathname: router.pathname, query: q }, undefined, {
        shallow: true,
      });
    }
  }, [router]);

  return (
    <>
      <Head>
        <title>{categoryLabel} | Classy Diamonds</title>
        <meta
          name="description"
          content={`Explore ${categoryLabel} at Classy Diamonds. Filter by metal, stone, shape, price, and carat.`}
        />
      </Head>

      {/* Big hero to match Home (80vh, -mt-20, solid overlay) */}
      <HeroBanner
        title={categoryLabel}
        subtitle={heroSubtitle}
        imageSrc={heroImage}
        heightClass="h-[80vh]"
        topOffsetClass="-mt-20"
        overlay="solid"
      />

      {/* Breadcrumbs – left edge like other pages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
        <Breadcrumbs />
      </div>

      {/* ONLY subcategory cards (no main category grid here) */}
      {subcategories.length > 0 && (
        <div className="mt-2">
          <SubcategoryCards
            category={categorySlug}
            subcategories={subcategories.map((s) => ({
              key: s.slug,
              label: s.label,
              // Temporary image mapping; replace with real subcategory images if you have them
              image:
                s.slug === "engagement"
                  ? "/category/engagement-cat.jpg"
                  : s.slug === "wedding-bands"
                  ? "/category/wedding-band-cat.jpg"
                  : s.slug === "studs"
                  ? "/category/earring-cat.jpg"
                  : s.slug === "tennis"
                  ? "/category/bracelet-cat.jpg"
                  : s.slug === "pendants"
                  ? "/category/necklace-cat.jpg"
                  : "/category/ring-cat.jpg",
            }))}
          />
        </div>
      )}

      {/* Anchor for scroll=true */}
      <div id="category-header" className="sr-only" aria-hidden="true" />

      {/* Heading */}
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide mb-4">
            {categoryLabel}
          </h1>
        </div>
      </div>

      {/* Main content: Sidebar + Grid (+ Add to Cart) */}
      <section className="px-4 sm:px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            {/* Sidebar (hidden on mobile by default; could add a drawer later) */}
            <div className="hidden md:block">
              <FiltersSidebar />
            </div>

            {/* Product grid */}
            {products.length === 0 ? (
              <p className="text-white/80">No products found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => {
                  const href = `/category/${encodeURIComponent(
                    categorySlug
                  )}/${encodeURIComponent(p.slug)}`;
                  return (
                    <div
                      key={p.slug}
                      className="group rounded-xl overflow-hidden bg-[#25304f] hover:shadow-xl transition flex flex-col"
                    >
                      <Link href={href} className="block">
                        <div className="relative aspect-square">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full bg-black/20" />
                          )}
                        </div>
                      </Link>

                      <div className="p-3 flex flex-col gap-2">
                        <Link href={href} className="block">
                          <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:underline">
                            {p.name}
                          </h4>
                        </Link>

                        <div className="flex items-center justify-between">
                          <div>
                            {p.salePrice ? (
                              <div className="flex items-center gap-2">
                                <span className="text-white font-semibold">
                                  ${Number(p.salePrice).toFixed(2)}
                                </span>
                                <span className="text-white/60 line-through text-sm">
                                  ${Number(p.price).toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-white font-semibold">
                                ${Number(p.price).toFixed(2)}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              addToCart({
                                id: p._id || p.id || p.slug, // fallback
                                slug: p.slug,
                                name: p.name,
                                price: p.price,
                                discountedPrice: p.salePrice,
                                image: p.image,
                                quantity: 1,
                              })
                            }
                            className="px-3 py-2 bg-[#e0e0e0] text-[#1f2a44] rounded-xl text-xs shadow hover:shadow-md hover:scale-105 transition"
                            aria-label={`Add ${p.name} to cart`}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
