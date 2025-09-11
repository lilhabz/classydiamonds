// pages/category/[category]/subcategory/[subcategory].tsx
"use client";

import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import FiltersSidebar from "@/components/FiltersSidebar";
import HeroBanner from "@/components/HeroBanner";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import SubcategoryCards from "@/components/SubcategoryCards";

import {
  CATEGORY_LABELS,
  SUBCATEGORY_MAP,
  canonicalizeCategory,
  categoryCandidatesFor, // ⬅️ use tolerant category candidates
  toBaseSubcategory, // ⬅️ normalize route sub ("pendants"→"pendant")
} from "@/data/taxonomy";

/* ------------------------------ Types ------------------------------ */
type Product = {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  category: string;
  subcategory?: string;
  subCategory?: string; // legacy
  metal?: string;
  stone?: string;
  shape?: string;
  carat?: number;
  slug: string;
  inStock?: boolean; // ✅ real stock flag
  stock?: boolean;
  quantity?: number;
};

type PageProps = {
  categorySlug: string;
  categoryLabel: string;
  subcategorySlug: string;
  subcategoryLabel: string;
  heroImage: string;
  heroSubtitle?: string;
  products: Product[];
  subcategories: { slug: string; label: string }[];
};

/* ------------------------- Helpers / Hero -------------------------- */
const titleCase = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/** Hero images keyed by category; subtitles will be computed separately */
const HERO_BY_CATEGORY: Record<string, { image: string }> = {
  engagement: { image: "/category-hero/engagement-ring-hero.jpg" },
  "wedding-bands": { image: "/category-hero/wedding-band-hero.jpg" },
  rings: { image: "/category-hero/ring-hero.jpg" },
  bracelets: { image: "/category-hero/bracelet-hero.jpg" },
  "necklaces-pendants": { image: "/category-hero/necklace-hero.jpg" },
  earrings: { image: "/category-hero/earring-hero.jpg" },
};

const SUBHEADERS: Record<
  string,
  { default: string; subs?: Record<string, string> }
> = {
  "necklaces-pendants": {
    default: "Elevate every neckline with fine balance and proportion.",
    subs: {
      pendants: "Perfectly scaled focal points—delicate to dramatic.",
      solitaire: "A singular diamond, precisely suspended.",
      chains: "Substantial links with smooth articulation.",
      nameplate: "Personalized lettering, crisp and refined.",
      lockets: "A keepsake close to the heart.",
    },
  },
  rings: {
    default: "Signature silhouettes designed for daily sophistication.",
  },
  bracelets: { default: "Impeccable craftsmanship—made to move with you." },
  earrings: { default: "Balanced pairs with impeccable set and finish." },
};

const resolveSubheader = (category: string, sub: string): string => {
  const cat = SUBHEADERS[category];
  if (!cat) return "Thoughtfully designed and beautifully finished.";
  const specific = cat.subs?.[sub.toLowerCase()];
  return specific || cat.default;
};

/* ----------------------------- SSR ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const categorySlug = String(ctx.params?.category || "").toLowerCase();
  const subcategorySlug = String(ctx.params?.subcategory || "").toLowerCase();
  if (!categorySlug || !subcategorySlug) return { notFound: true };

  const catCanon = canonicalizeCategory(categorySlug) || categorySlug;
  const categoryLabel =
    CATEGORY_LABELS[catCanon as keyof typeof CATEGORY_LABELS] ??
    titleCase(catCanon);
  const subcategoryLabel = titleCase(subcategorySlug);

  // Build sibling subcategory list from canonical taxonomy
  const siblingSlugs =
    SUBCATEGORY_MAP[catCanon as keyof typeof SUBCATEGORY_MAP] || [];
  const subcategories = siblingSlugs.map((slug) => ({
    slug,
    label: titleCase(slug),
  }));

  // Optional query filters so FiltersSidebar works here too
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

  // ✅ Normalize category & sub for DB matching
  const catCandidates = categoryCandidatesFor(categorySlug);
  const baseSub =
    toBaseSubcategory(subcategorySlug, catCanon) || subcategorySlug;

  // Include plural + singular variants for necklace family
  const subCandidatesSet = new Set<string>([baseSub, subcategorySlug]);
  if (catCanon === "necklaces-pendants") {
    if (baseSub === "pendant") subCandidatesSet.add("pendants");
    if (baseSub === "chain") subCandidatesSet.add("chains");
    if (baseSub === "locket") subCandidatesSet.add("lockets");
    if (baseSub === "nameplate") subCandidatesSet.add("nameplates"); // tolerate plural
  }
  const subCandidates = Array.from(subCandidatesSet);

  let products: Product[] = [];
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "classydiamonds");

    // Tolerant query:
    // 1) category is one of the candidates AND sub matches in subcategory/subCategory
    // 2) legacy: category itself equals the sub (e.g., "pendant"/"pendants")
    const q: any = {
      $or: [
        {
          category: { $in: catCandidates },
          $or: [
            { subcategory: { $in: subCandidates } },
            { subCategory: { $in: subCandidates } },
          ],
        },
        { category: { $in: subCandidates } }, // legacy shape
      ],
    };

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
        imageUrl: 1,
        category: 1,
        subcategory: 1,
        subCategory: 1,
        metal: 1,
        stone: 1,
        shape: 1,
        carat: 1,
        slug: 1,
        inStock: 1,
        stock: 1,
        quantity: 1,
      })
      .toArray();

    products = docs.map((d: any) => ({
      _id: String(d._id),
      name: d.name,
      price: d.price,
      salePrice: d.salePrice ?? null,
      image: d.imageUrl || d.image || "",
      category: (d.category || "").toLowerCase(),
      subcategory: (d.subcategory || d.subCategory || "").toLowerCase(),
      metal: (d.metal || "").toLowerCase(),
      stone: (d.stone || "").toLowerCase(),
      shape: (d.shape || "").toLowerCase(),
      carat: typeof d.carat === "number" ? d.carat : undefined,
      slug: d.slug,
      inStock:
        typeof d.inStock === "boolean"
          ? d.inStock
          : typeof d.stock === "boolean"
          ? d.stock
          : typeof d.quantity === "number"
          ? d.quantity > 0
          : true,
    }));
  } catch {
    products = [];
  }

  const heroImage = HERO_BY_CATEGORY[catCanon]?.image ?? "/hero-jewelry.jpg";
  const heroSubtitle = resolveSubheader(catCanon, subcategorySlug);

  return {
    props: {
      categorySlug: catCanon,
      categoryLabel,
      subcategorySlug,
      subcategoryLabel,
      heroImage,
      heroSubtitle,
      products,
      subcategories,
    },
  };
};

/* --------------------------- Icons (inline) --------------------------- */
function IconHamburger(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M3 6h18M3 12h18M3 18h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconClose(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------------------------- PAGE --------------------------------- */
export default function SubcategoryPage({
  categorySlug,
  categoryLabel,
  subcategorySlug,
  subcategoryLabel,
  heroImage,
  heroSubtitle,
  products,
  subcategories,
}: PageProps) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(8);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Force open-from-top (unless ?scroll=true is set intentionally)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { scroll } = router.query as { scroll?: string };
    const prev = (history as any).scrollRestoration;
    try {
      (history as any).scrollRestoration = "manual";
    } catch {}
    if (scroll !== "true") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    return () => {
      try {
        (history as any).scrollRestoration = prev || "auto";
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preserve ?scroll=true behavior (e.g., from category links)
  useEffect(() => {
    const { scroll } = router.query as { scroll?: string };
    if (scroll === "true") {
      const header = document.getElementById("subcategory-header");
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

  // reset visible when route changes
  useEffect(() => setVisibleCount(8), [categorySlug, subcategoryLabel]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileFiltersOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [mobileFiltersOpen]);

  // ⭐ EXACT REQUEST: Only override label for Mens Rings (no changes to womens/her/etc.)
  const typeLabelFrom = (p: Product) => {
    const base = (p.subcategory || p.subCategory || "").toLowerCase();
    const pageSub = (subcategorySlug || "").toLowerCase();

    if (
      (categorySlug === "rings" || categorySlug === "ring") &&
      (base === "mens" ||
        base === "mens-rings" ||
        pageSub === "mens" ||
        pageSub === "mens-rings")
    ) {
      return "Mens Rings";
    }

    // Default logic unchanged
    return (
      base && base !== "all"
        ? titleCase(base)
        : categoryLabel.replace(/& Pendants/i, "Necklace")
    ).trim();
  };

  const subcatImage = (slug: string) => {
    if (categorySlug === "rings") {
      if (slug === "engagement-rings") return "/category/engagement-cat.jpg";
      if (slug === "wedding-rings") return "/category/wedding-band-cat.jpg";
      return "/category/ring-cat.jpg";
    }
    if (categorySlug === "earrings") return "/category/earring-cat.jpg";
    if (categorySlug === "bracelets") return "/category/bracelet-cat.jpg";
    if (categorySlug === "necklaces-pendants")
      return "/category/necklace-cat.jpg";
    return "/category/ring-cat.jpg";
  };

  return (
    <div className="subcategory-page">
      <Head>
        <title>
          {subcategoryLabel}
          {categorySlug ? ` | ${categoryLabel}` : ""} | Classy Diamonds
        </title>
        <meta
          name="description"
          content={`Shop ${subcategoryLabel} in ${categoryLabel}. Filter by metal, stone, shape, price, and carat.`}
        />
      </Head>

      {/* 80vh hero */}
      <HeroBanner
        title={subcategoryLabel}
        subtitle={heroSubtitle}
        imageSrc={heroImage}
        heightClass="h-[80vh]"
        topOffsetClass="-mt-20"
        overlay="solid"
      />

      {/* Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-6">
        <Breadcrumbs />
      </div>

      {/* Centered title */}
      <div className="text-center mt-2 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
          {subcategoryLabel}
        </h1>
      </div>

      {/* Subcategory navigation row (siblings) */}
      {subcategories.length > 0 && (
        <div className="mt-4 px-4 sm:px-6">
          <SubcategoryCards
            category={categorySlug}
            subcategories={subcategories.map((s) => ({
              key: s.slug,
              label: s.label,
              image: subcatImage(s.slug),
            }))}
          />
          <div className="h-6 sm:h-10" />
        </div>
      )}

      {/* Anchor for scroll=true */}
      <div id="subcategory-header" className="sr-only" aria-hidden="true" />

      {/* Main content: Sidebar + Grid */}
      <section className="mt-6 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto mb-20">
        {/* Mobile: count + Filters button */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <div className="text-sm text-white/80">
            {products.length} {products.length === 1 ? "item" : "items"}
          </div>
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
            aria-haspopup="dialog"
            aria-controls="filters-drawer"
          >
            <IconHamburger className="w-5 h-5" />
            Filters
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Desktop Filters */}
          <div className="hidden lg:block">
            <FiltersSidebar mode="desktop" />
          </div>

          {/* Product grid */}
          <div>
            {products.length === 0 ? (
              <p className="text-white/80">No products found.</p>
            ) : (
              <div className="grid gap-x-6 gap-y-10 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.slice(0, visibleCount).map((p) => {
                  const href = `/category/${encodeURIComponent(
                    categorySlug
                  )}/${encodeURIComponent(p.slug)}`;
                  return (
                    <ProductCard
                      key={p._id || p.id || p.slug}
                      slug={p.slug}
                      image={p.image}
                      name={p.name}
                      price={p.price}
                      salePrice={p.salePrice ?? null}
                      href={href}
                      inStock={
                        typeof p.inStock === "boolean"
                          ? p.inStock
                          : typeof p.stock === "boolean"
                          ? p.stock
                          : typeof p.quantity === "number"
                          ? p.quantity > 0
                          : true
                      }
                      typeLabel={typeLabelFrom(p)}
                      categorySlug={categorySlug}
                      subcategorySlug={
                        (p.subcategory ||
                          p.subCategory ||
                          subcategorySlug) as any
                      }
                    />
                  );
                })}
              </div>
            )}

            {visibleCount < products.length && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setVisibleCount((v) => v + 4)}
                  className="px-8 py-4 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-full"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 📱 Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div
          id="filters-drawer"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] lg:hidden"
        >
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-[var(--bg-page)] shadow-xl border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-base font-semibold">Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-md hover:bg-white/10"
                aria-label="Close"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
              <FiltersSidebar
                mode="drawer"
                open={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
              />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[var(--bg-page)]">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full px-4 py-3 rounded-lg bg-[var(--foreground)] text-[var(--bg-nav)] font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
