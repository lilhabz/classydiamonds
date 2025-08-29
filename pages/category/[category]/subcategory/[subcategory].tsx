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
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";
import { CATEGORY_LABELS } from "@/data/taxonomy";

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
  metal?: string;
  stone?: string;
  shape?: string;
  carat?: number;
  slug: string;
};

type PageProps = {
  categorySlug: string;
  categoryLabel: string;
  subcategorySlug: string;
  subcategoryLabel: string;
  heroImage: string;
  heroSubtitle?: string;
  products: Product[];
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

/** Professional subheaders by category + common subcategories */
const SUBHEADERS: Record<
  string,
  { default: string; subs?: Record<string, string> }
> = {
  engagement: {
    default: "Expertly crafted settings to showcase your center stone.",
    subs: {
      solitaire: "Minimalist elegance for maximum brilliance.",
      halo: "A ring of light to amplify sparkle and presence.",
      "three-stone": "Past, present, future—perfectly balanced.",
      eternity: "Unbroken sparkle, timeless devotion.",
    },
  },
  "wedding-bands": {
    default: "Classic profiles, comfort-fit designs, precision detailing.",
    subs: {
      mens: "Refined profiles built for everyday wear.",
      eternity: "Full-circle diamonds for uninterrupted fire.",
      pave: "Fine pavé for delicate, continuous shimmer.",
    },
  },
  rings: {
    default: "Signature silhouettes designed for daily sophistication.",
    subs: {
      solitaire: "Clean lines, iconic shape, enduring style.",
      halo: "A luminous frame that intensifies your center stone.",
      "three-stone": "A trio of facets—symbolic and striking.",
      eternity: "Infinite brilliance in a continuous circle.",
      mens: "Understated strength with elevated finish.",
    },
  },
  bracelets: {
    default: "Impeccable craftsmanship—made to move with you.",
    subs: {
      tennis: "Hand-set diamonds in a fluid, flexible line.",
      bangles: "Sculptural forms with a polished finish.",
      cuffs: "Bold contours, effortless statement.",
      chains: "Substantial links with smooth articulation.",
    },
  },
  "necklaces-pendants": {
    default: "Elevate every neckline with fine balance and proportion.",
    subs: {
      pendants: "Perfectly scaled focal points—delicate to dramatic.",
      solitaire: "A singular diamond, precisely suspended.",
      station: "Evenly spaced brilliance for modern symmetry.",
      nameplates: "Personalized lettering, crisp and refined.",
      pearl: "Lustrous gems with timeless grace.",
    },
  },
  earrings: {
    default: "Balanced pairs with impeccable set and finish.",
    subs: {
      studs: "Everyday brilliance—secure, bright, essential.",
      hoops: "Sleek curvature with a flawless mirror polish.",
      drops: "Elongated lines for graceful movement.",
      huggies: "Close-fitting sparkle with easy wear.",
    },
  },
};

const resolveSubheader = (category: string, sub: string): string => {
  const cat = SUBHEADERS[category];
  if (!cat) return "Thoughtfully designed and beautifully finished.";

  // slugify sub so "Three Stone", "three-stone", "THREE stone" all match
  const key = (sub || "").toLowerCase().trim().replace(/\s+/g, "-"); // spaces -> dashes

  const specific = cat.subs?.[key];
  return specific || cat.default;
};

const isRingCategory = (cat?: string) =>
  (cat ?? "").toLowerCase().includes("ring");

/* ----------------------------- SSR ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const categorySlug = String(ctx.params?.category || "").toLowerCase();
  const subcategorySlug = String(ctx.params?.subcategory || "").toLowerCase();
  if (!categorySlug || !subcategorySlug) return { notFound: true };

  const categoryLabel =
    CATEGORY_LABELS[categorySlug as keyof typeof CATEGORY_LABELS] ??
    titleCase(categorySlug);
  const subcategoryLabel = titleCase(subcategorySlug);

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

  let products: Product[] = [];
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "classydiamonds");

    // STRICT match on category + subcategory so edited/admin values show up
    const q: any = { category: categorySlug, subcategory: subcategorySlug };
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
      salePrice: d.salePrice ?? null,
      image: d.imageUrl || d.image || "", // ✅ fallback to imageUrl
      category: (d.category || "").toLowerCase(),
      subcategory: (d.subcategory || d.subCategory || "").toLowerCase(),
      metal: (d.metal || "").toLowerCase(),
      stone: (d.stone || "").toLowerCase(),
      shape: (d.shape || "").toLowerCase(),
      carat: typeof d.carat === "number" ? d.carat : undefined,
      slug: d.slug,
    }));
  } catch {
    products = [];
  }

  const heroImage =
    HERO_BY_CATEGORY[categorySlug]?.image ?? "/hero-jewelry.jpg";

  // 🔹 Compute a professional subheader for the hero (category + subcategory aware)
  const heroSubtitle = resolveSubheader(categorySlug, subcategorySlug);

  return {
    props: {
      categorySlug,
      categoryLabel,
      subcategorySlug,
      subcategoryLabel,
      heroImage,
      heroSubtitle,
      products,
    },
  };
};

/* ---------------------------------- PAGE --------------------------------- */
export default function SubcategoryPage({
  categorySlug,
  categoryLabel,
  subcategoryLabel,
  heroImage,
  heroSubtitle,
  products,
}: PageProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);

  /* 🔝 Force open-from-top (unless ?scroll=true is set intentionally) */
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

  // reset visible when route changes (matches jewelry behavior)
  useEffect(() => setVisibleCount(8), [categorySlug, subcategoryLabel]);

  return (
    <div className="subcategory-page">
      <Head>
        <title>
          {subcategoryLabel}
          {categoryLabel !== subcategoryLabel ? ` | ${categoryLabel}` : ""} |
          Classy Diamonds
        </title>
        <meta
          name="description"
          content={`Shop ${subcategoryLabel} in ${categoryLabel}. Filter by metal, stone, shape, price, and carat.`}
        />
      </Head>

      {/* 80vh hero */}
      <HeroBanner
        title={subcategoryLabel}
        subtitle={heroSubtitle} /* ← now a professional, category-aware line */
        imageSrc={heroImage}
        heightClass="h-[80vh]"
        topOffsetClass="-mt-20"
        overlay="solid"
      />

      {/* Breadcrumbs — same left-edge wrapper as Jewelry */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-6">
        <Breadcrumbs />
      </div>

      {/* Centered title matching other pages */}
      <div className="text-center mt-2 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
          {subcategoryLabel}
        </h1>
        {/* Removed the extra subtitle here to avoid duplicating the hero line */}
      </div>

      {/* Anchor for scroll=true */}
      <div id="subcategory-header" className="sr-only" aria-hidden="true" />

      {/* Main content: Sidebar + Grid */}
      <section className="mt-6 px-4 sm:px-6 max-w-7xl mx-auto mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Filters */}
          <div className="block">
            <FiltersSidebar />
          </div>

          {/* Product grid — subcategory-only sizing to match Jewelry */}
          <div>
            {products.length === 0 ? (
              <p className="text-white/80">No products found.</p>
            ) : (
              <div className="fixed-card-grid">
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
                      onAddToCart={() => {
                        if (isRingCategory(p.category)) {
                          return router.push(href);
                        }
                        addToCart({
                          id: p._id || p.id || p.slug,
                          slug: p.slug,
                          name: p.name,
                          price: p.price,
                          discountedPrice: p.salePrice ?? undefined,
                          image: p.image,
                          quantity: 1,
                        });
                      }}
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

      {/* 🔧 Subcategory-only: replicate Jewelry page card footprint */}
      <style jsx global>{`
        /* Grid uses OUTER card size for columns: 219px */
        .subcategory-page .fixed-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, 219px);
          gap: 1.5rem; /* Tailwind gap-6 */
          justify-content: center;
        }
        @media (min-width: 640px) {
          .subcategory-page .fixed-card-grid {
            justify-content: start;
          }
        }

        /* ProductCard root (has .group) — force the exact outer size */
        .subcategory-page .fixed-card-grid > .group {
          width: 219px !important; /* outer card width */
          height: 339px !important; /* outer card height */
          box-sizing: border-box;
          overflow: hidden; /* prevents spill if text is long */
          display: flex;
          flex-direction: column;
        }

        /* Do NOT size the image wrapper: keep aspect-square + w-full.
           With p-3 padding (12*2=24), inner width = 219 - 24 = 195px,
           so the image becomes 195x195 automatically, matching Jewelry. */
      `}</style>
    </div>
  );
}
