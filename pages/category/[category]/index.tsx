// pages/category/[category]/index.tsx
"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import CategoryGrid, { CategoryItem } from "@/components/CategoryGrid";
import FiltersSidebar from "@/components/FiltersSidebar";

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
  categories: CategoryItem[];
  subcategories: SubItem[];
  products: Product[];
};

const CATEGORIES: CategoryItem[] = [
  {
    label: "Engagement",
    slug: "engagement",
    image: "/category/engagement.jpg",
  },
  {
    label: "Wedding Bands",
    slug: "wedding-bands",
    image: "/category/wedding-bands.jpg",
  },
  { label: "Rings", slug: "rings", image: "/category/rings.jpg" },
  { label: "Bracelets", slug: "bracelets", image: "/category/bracelets.jpg" },
  { label: "Necklaces", slug: "necklaces", image: "/category/necklaces.jpg" },
  { label: "Earrings", slug: "earrings", image: "/category/earrings.jpg" },
  { label: "For Her", slug: "for-her", image: "/category/for-her.jpg" },
  { label: "For Him", slug: "for-him", image: "/category/for-him.jpg" },
];

const CATEGORY_SUBS: Record<string, SubItem[]> = {
  rings: [
    { label: "All Rings", slug: "all" },
    { label: "Engagement Rings", slug: "engagement" },
    { label: "Wedding Bands", slug: "wedding-bands" },
    { label: "Solitaire", slug: "solitaire" },
    { label: "Halo", slug: "halo" },
    { label: "Three-Stone", slug: "three-stone" },
    { label: "Eternity", slug: "eternity" },
    { label: "Men’s Rings", slug: "mens" },
  ],
  earrings: [
    { label: "All Earrings", slug: "all" },
    { label: "Studs", slug: "studs" },
    { label: "Hoops", slug: "hoops" },
    { label: "Drops", slug: "drops" },
    { label: "Huggies", slug: "huggies" },
  ],
  bracelets: [
    { label: "All Bracelets", slug: "all" },
    { label: "Tennis", slug: "tennis" },
    { label: "Bangles", slug: "bangles" },
    { label: "Cuffs", slug: "cuffs" },
    { label: "Chains", slug: "chains" },
  ],
  necklaces: [
    { label: "All Necklaces", slug: "all" },
    { label: "Pendants", slug: "pendants" },
    { label: "Solitaire", slug: "solitaire" },
    { label: "Station", slug: "station" },
    { label: "Nameplates", slug: "nameplates" },
    { label: "Pearl", slug: "pearl" },
  ],
  // keep others as needed...
};

const labelFor = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

/* ----------------------------- SERVER DATA ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const categorySlug = String(ctx.params?.category || "").toLowerCase();
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

  if (!categorySlug) return { notFound: true };

  return {
    props: {
      categorySlug,
      categoryLabel,
      categories: CATEGORIES,
      subcategories: CATEGORY_SUBS[categorySlug] || [
        { label: "All", slug: "all" },
      ],
      products,
    },
  };
};

/* ---------------------------------- PAGE --------------------------------- */
export default function CategoryPage({
  categorySlug,
  categoryLabel,
  categories,
  subcategories,
  products,
}: PageProps) {
  const router = useRouter();
  const activeSub = (router.query.sub as string) || "all";

  // For “Category / Subcategory”
  const subLabel =
    subcategories.find((s) => s.slug.toLowerCase() === activeSub.toLowerCase())
      ?.label || (activeSub === "all" ? "All" : activeSub);

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

  const pushSub = (sub: string) => {
    const next = { ...router.query };
    if (sub === "all") delete (next as any).sub;
    else (next as any).sub = sub;
    router.push(
      { pathname: `/category/${categorySlug}`, query: next },
      undefined,
      { shallow: true }
    );
  };

  return (
    <>
      <Head>
        <title>{categoryLabel} | Classy Diamonds</title>
        <meta
          name="description"
          content={`Explore ${categoryLabel} at Classy Diamonds. Filter by metal, stone, shape, price, and carat.`}
        />
      </Head>

      {/* Row 1: Top categories */}
      <CategoryGrid
        items={categories}
        title="Categories"
        fullBleedDesktop
        desktopCols={6}
        activeSlug={categorySlug}
        routeTo="/category"
      />

      {/* Row 2: Subcategory pills (no "Subcategories" title) */}
      <section className="mt-3 mb-6 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* mobile pills */}
          <div className="sm:hidden mt-1 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {subcategories.map((s) => {
                const active = activeSub.toLowerCase() === s.slug.toLowerCase();
                return (
                  <button
                    key={s.slug}
                    onClick={() => pushSub(s.slug)}
                    className={
                      "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border " +
                      (active
                        ? "bg-white text-[#1f2a44] border-white"
                        : "bg-[#25304f] text-white border-white/20 hover:bg-[#2b3760]")
                    }
                    aria-pressed={active}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* desktop pills */}
          <div className="hidden sm:flex gap-2 mt-1 flex-wrap">
            {subcategories.map((s) => {
              const active = activeSub.toLowerCase() === s.slug.toLowerCase();
              return (
                <button
                  key={s.slug}
                  onClick={() => pushSub(s.slug)}
                  className={
                    "px-3 py-2 rounded-lg text-sm font-medium border " +
                    (active
                      ? "bg-white text-[#1f2a44] border-white"
                      : "bg-[#25304f] text-white border-white/20 hover:bg-[#2b3760]")
                  }
                  aria-pressed={active}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Anchor for scroll=true */}
      <div id="category-header" className="sr-only" aria-hidden="true" />

      {/* Breadcrumb-esque + Heading */}
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-white/70 text-sm mb-1">
            {categoryLabel} / <span className="text-white">{subLabel}</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide mb-4">
            {categoryLabel}
          </h1>
        </div>
      </div>

      {/* Main content: Sidebar + Grid */}
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
                    <Link
                      key={p.slug}
                      href={href}
                      className="group rounded-xl overflow-hidden bg-[#25304f] hover:shadow-xl transition"
                    >
                      <div className="relative aspect-square">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-black/20" />
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:underline">
                          {p.name}
                        </h4>
                        <div className="mt-1">
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
                      </div>
                    </Link>
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
