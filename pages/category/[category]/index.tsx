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

// Fallback local data if DB isn’t ready
import { productsData as staticProducts } from "@/data/productsData";
import { jewelryData as staticJewelry } from "@/data/jewelryData";

type Product = {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  subcategory?: string;
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
  { label: "Engagement",     slug: "engagement",     image: "/category/engagement.jpg" },
  { label: "Wedding Bands",  slug: "wedding-bands",  image: "/category/wedding-bands.jpg" },
  { label: "Rings",          slug: "rings",          image: "/category/rings.jpg" },
  { label: "Bracelets",      slug: "bracelets",      image: "/category/bracelets.jpg" },
  { label: "Necklaces",      slug: "necklaces",      image: "/category/necklaces.jpg" },
  { label: "Earrings",       slug: "earrings",       image: "/category/earrings.jpg" },
  { label: "For Her",        slug: "for-her",        image: "/category/for-her.jpg" },
  { label: "For Him",        slug: "for-him",        image: "/category/for-him.jpg" },
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
  engagement: [
    { label: "All Engagement", slug: "all" },
    { label: "Solitaire", slug: "solitaire" },
    { label: "Halo", slug: "halo" },
    { label: "Three-Stone", slug: "three-stone" },
    { label: "Vintage", slug: "vintage" },
    { label: "Hidden Halo", slug: "hidden-halo" },
  ],
  "wedding-bands": [
    { label: "All Wedding Bands", slug: "all" },
    { label: "Women’s Bands", slug: "womens" },
    { label: "Men’s Bands", slug: "mens" },
    { label: "Eternity Bands", slug: "eternity" },
    { label: "Anniversary", slug: "anniversary" },
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
  earrings: [
    { label: "All Earrings", slug: "all" },
    { label: "Studs", slug: "studs" },
    { label: "Hoops", slug: "hoops" },
    { label: "Drops", slug: "drops" },
    { label: "Huggies", slug: "huggies" },
  ],
  "for-her": [
    { label: "All For Her", slug: "all" },
    { label: "Rings", slug: "rings" },
    { label: "Bracelets", slug: "bracelets" },
    { label: "Necklaces", slug: "necklaces" },
    { label: "Earrings", slug: "earrings" },
  ],
  "for-him": [
    { label: "All For Him", slug: "all" },
    { label: "Rings", slug: "rings" },
    { label: "Bracelets", slug: "bracelets" },
    { label: "Chains", slug: "chains" },
  ],
};

const labelFor = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const categorySlug = String(ctx.params?.category || "").toLowerCase();
  const categoryLabel = labelFor(categorySlug);

  let products: Product[] = [];
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "classydiamonds");
    const docs = await db
      .collection("products")
      .find({ category: categorySlug })
      .project({ _id: 1, name: 1, price: 1, salePrice: 1, image: 1, category: 1, subcategory: 1, slug: 1 })
      .toArray();

    products = docs.map((d: any) => ({
      _id: String(d._id),
      name: d.name,
      price: d.price,
      salePrice: d.salePrice,
      image: d.image,
      category: d.category,
      subcategory: d.subcategory,
      slug: d.slug,
    }));
  } catch {
    const local = [...(staticProducts || []), ...(staticJewelry || [])] as Product[];
    products = local.filter((p) => (p.category || "").toLowerCase() === categorySlug);
  }

  if (!categorySlug) return { notFound: true };

  return {
    props: {
      categorySlug,
      categoryLabel,
      categories: CATEGORIES,
      subcategories: CATEGORY_SUBS[categorySlug] || [{ label: "All", slug: "all" }],
      products,
    },
  };
};

export default function CategoryPage({ categorySlug, categoryLabel, categories, subcategories, products }: PageProps) {
  const router = useRouter();
  const activeSub = (router.query.sub as string) || "all";

  const subLabel =
    subcategories.find((s) => s.slug.toLowerCase() === activeSub.toLowerCase())?.label ||
    (activeSub === "all" ? "All" : activeSub);

  useEffect(() => {
    const { scroll } = router.query as { scroll?: string };
    if (scroll === "true") {
      const header = document.getElementById("category-header");
      if (!header) return;
      const navOffset = 80;
      const y = header.getBoundingClientRect().top + window.scrollY - navOffset - 20;
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "smooth" }));
      const q = { ...router.query };
      delete (q as any).scroll;
      router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
    }
  }, [router]);

  const pushSub = (sub: string) => {
    router.push({ pathname: `/category/${categorySlug}`, query: sub === "all" ? {} : { sub } }, undefined, { shallow: true });
  };

  const shown = products.filter((p) =>
    activeSub === "all" ? true : (p.subcategory || "").toLowerCase() === activeSub.toLowerCase()
  );

  return (
    <>
      <Head>
        <title>{categoryLabel} | Classy Diamonds</title>
        <meta name="description" content={`Explore ${categoryLabel} at Classy Diamonds. Premium pieces and timeless style.`} />
      </Head>

      {/* Row 1: top categories */}
      <CategoryGrid items={categories} title="Categories" fullBleedDesktop desktopCols={6} activeSlug={categorySlug} routeTo="/category" />

      {/* Row 2: subcategories */}
      <section className="mt-4 mb-6 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h3 className="text-xl sm:text-2xl font-semibold tracking-wide">Subcategories</h3>

          {/* mobile */}
          <div className="sm:hidden mt-3 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {subcategories.map((s) => {
                const active = activeSub.toLowerCase() === s.slug.toLowerCase();
                return (
                  <button
                    key={s.slug}
                    onClick={() => pushSub(s.slug)}
                    className={
                      "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border " +
                      (active ? "bg-white text-[#1f2a44] border-white" : "bg-[#25304f] text-white border-white/20 hover:bg-[#2b3760]")
                    }
                    aria-pressed={active}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* desktop */}
          <div className="hidden sm:flex gap-2 mt-3 flex-wrap">
            {subcategories.map((s) => {
              const active = activeSub.toLowerCase() === s.slug.toLowerCase();
              return (
                <button
                  key={s.slug}
                  onClick={() => pushSub(s.slug)}
                  className={
                    "px-3 py-2 rounded-lg text-sm font-medium border " +
                    (active ? "bg-white text-[#1f2a44] border-white" : "bg-[#25304f] text-white border-white/20 hover:bg-[#2b3760]")
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

      {/* Breadcrumb-ish line + Heading */}
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-white/70 text-sm mb-1">
            Category / <span className="text-white">{subLabel}</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide mb-4">{categoryLabel}</h1>
        </div>
      </div>

      {/* Product grid */}
      <section className="px-4 sm:px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          {shown.length === 0 ? (
            <p className="text-white/80">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {shown.map((p) => {
                const href = `/category/${encodeURIComponent(categorySlug)}/${encodeURIComponent(p.slug)}`;
                return (
                  <Link key={p.slug} href={href} className="group rounded-xl overflow-hidden bg-[#25304f] hover:shadow-xl transition">
                    <div className="relative aspect-square">
                      {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover" /> : <div className="w-full h-full bg-black/20" />}
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:underline">{p.name}</h4>
                      <div className="mt-1">
                        {p.salePrice ? (
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">${Number(p.salePrice).toFixed(2)}</span>
                            <span className="text-white/60 line-through text-sm">${Number(p.price).toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-white font-semibold">${Number(p.price).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
