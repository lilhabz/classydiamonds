// 📄 pages/category/[category]/[sub].tsx
// Subcategory listing (e.g., /category/ring/signet-rings or /category/ring/wedding-rings)

import Head from "next/head";
import { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import FiltersSidebar from "@/components/FiltersSidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import SubcategoryCards from "@/components/SubcategoryCards";
import { CATEGORY_LABELS, SUBCATEGORY_MAP } from "@/data/taxonomy";
import { toBaseSubcategory } from "@/lib/taxonomy";

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
  inStock?: boolean;
};

type SubItem = { label: string; slug: string };

type PageProps = {
  categoryUi: string;        // as seen in the URL (e.g., "ring")
  categoryLabel: string;     // pretty label from taxonomy
  routeSub: string;          // route slug (e.g., "signet-rings")
  routeSubLabel: string;     // pretty version (e.g., "Signet Rings")
  products: Product[];
  subcategories: SubItem[];  // for the subcategory card row
};

/* ------------------------- Helpers ------------------------- */
const titleCase = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const prettySub = (slug: string) =>
  slug.endsWith("-rings")
    ? titleCase(slug.replace(/-rings$/, "")) + " Rings"
    : titleCase(slug);

const canonicalCandidates = (cat: string) => {
  // Be forgiving: accept singular/plural mismatches in DB
  const v = cat.toLowerCase();
  const set = new Set<string>([v]);
  if (v === "rings") set.add("ring");
  if (v === "ring") set.add("rings");
  if (v === "earrings") set.add("earring");
  if (v === "earring") set.add("earrings");
  if (v === "bracelets") set.add("bracelet");
  if (v === "bracelet") set.add("bracelets");
  // necklaces can be messy across repos; include common variants
  if (v === "necklaces" || v === "necklace") set.add("necklaces-pendants");
  if (v === "necklaces-pendants") { set.add("necklaces"); set.add("necklace"); }
  return Array.from(set);
};

/* ----------------------------- SERVER DATA ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const categoryUi = String(ctx.params?.category || "").toLowerCase(); // as in URL
  const routeSub = String(ctx.params?.sub || "").toLowerCase();        // e.g., signet-rings

  if (!categoryUi || !routeSub) return { notFound: true };

  // Convert storefront sub-route to our admin/base sub (e.g., signet-rings -> signet, wedding-rings -> wedding-bands)
  const baseSub = toBaseSubcategory(categoryUi, routeSub);
  if (!baseSub) return { notFound: true };

  // Pretty labels
  const categoryLabel =
    CATEGORY_LABELS[categoryUi as keyof typeof CATEGORY_LABELS] ?? titleCase(categoryUi);
  const routeSubLabel = prettySub(routeSub);

  // Query products: tolerate singular/plural category variants
  const catCandidates = canonicalCandidates(categoryUi);

  // Optional additional filters via querystring
  const metal = ctx.query.metal
    ? (Array.isArray(ctx.query.metal) ? ctx.query.metal : [ctx.query.metal]).map((m) =>
        String(m).toLowerCase()
      )
    : [];
  const stone = ctx.query.stone
    ? (Array.isArray(ctx.query.stone) ? ctx.query.stone : [ctx.query.stone]).map((s) =>
        String(s).toLowerCase()
      )
    : [];
  const shape = ctx.query.shape
    ? (Array.isArray(ctx.query.shape) ? ctx.query.shape : [ctx.query.shape]).map((s) =>
        String(s).toLowerCase()
      )
    : [];
  const priceMin = ctx.query.priceMin ? Number(ctx.query.priceMin) : undefined;
  const priceMax = ctx.query.priceMax ? Number(ctx.query.priceMax) : undefined;
  const caratMin = ctx.query.caratMin ? Number(ctx.query.caratMin) : undefined;
  const caratMax = ctx.query.caratMax ? Number(ctx.query.caratMax) : undefined;

  let products: Product[] = [];
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "classydiamonds");

    const q: any = {
      category: { $in: catCandidates },
      subcategory: baseSub,
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
        metal: 1,
        stone: 1,
        shape: 1,
        carat: 1,
        slug: 1,
        inStock: 1,  // may or may not exist
        stock: 1,    // legacy boolean?
        quantity: 1, // legacy numeric?
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

  // Build subcategory cards for the row (so users can jump across subs)
  const subSlugs =
    SUBCATEGORY_MAP[categoryUi as keyof typeof SUBCATEGORY_MAP] || [];
  const subcategories: SubItem[] = subSlugs.map((slug) => ({
    slug,
    label: prettySub(slug),
  }));

  return {
    props: {
      categoryUi,
      categoryLabel,
      routeSub,
      routeSubLabel,
      products,
      subcategories,
    },
  };
};

/* --------------------------- Icons (inline) --------------------------- */
function IconHamburger(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconClose(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------- PAGE --------------------------------- */
export default function SubcategoryPage({
  categoryUi,
  categoryLabel,
  routeSub,
  routeSubLabel,
  products,
  subcategories,
}: PageProps) {
  const router = useRouter();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Keep ?scroll=true behavior
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

  // Images for subcategory cards
  const subcatImage = (slug: string) => {
    if (categoryUi === "rings" || categoryUi === "ring") {
      if (slug === "engagement-rings") return "/category/engagement-cat.jpg";
      if (slug === "wedding-rings") return "/category/wedding-band-cat.jpg";
      return "/category/ring-cat.jpg";
    }
    if (categoryUi === "earrings" || categoryUi === "earring") return "/category/earring-cat.jpg";
    if (categoryUi === "bracelets" || categoryUi === "bracelet") return "/category/bracelet-cat.jpg";
    if (categoryUi === "necklaces-pendants" || categoryUi === "necklaces") return "/category/necklace-cat.jpg";
    return "/category/ring-cat.jpg";
  };

  const typeLabelFrom = (p: Product) => {
    const sub = (p.subcategory || "").trim();
    if (sub && sub !== "all")
      return sub.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    return categoryLabel.replace(/& Pendants/i, "Necklace");
  };

  return (
    <>
      <Head>
        <title>{routeSubLabel} | {categoryLabel} | Classy Diamonds</title>
        <meta
          name="description"
          content={`Explore ${routeSubLabel} in ${categoryLabel} at Classy Diamonds.`}
        />
      </Head>

      {/* Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-6">
        <Breadcrumbs
          customLabels={{
            [categoryUi]: categoryLabel,
            [routeSub]: routeSubLabel,
          }}
          customPaths={{
            [categoryUi]: `/category/${categoryUi}`,
            [routeSub]: `/category/${categoryUi}/${routeSub}`,
          }}
        />
      </div>

      {/* Title */}
      <div className="text-center mt-2 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide">
          {routeSubLabel}
        </h1>
        <p className="text-sm opacity-70 mt-1">{categoryLabel}</p>
      </div>

      {/* Subcategory navigation row */}
      {subcategories.length > 0 && (
        <div className="mt-4 px-4 sm:px-6">
          <div className="mx-auto max-w-screen-2xl">
            <SubcategoryCards
              category={categoryUi}
              subcategories={subcategories.map((s) => ({
                key: s.slug,
                label: s.label,
                image: subcatImage(s.slug),
                // You can optionally highlight the current s.slug === routeSub
              }))}
            />
          </div>
          <div className="h-6 sm:h-10" />
        </div>
      )}

      {/* Anchor for scroll=true */}
      <div id="subcategory-header" className="sr-only" aria-hidden="true" />

      {/* Main content: Sidebar + Grid */}
      <section className="mt-6 sm:mt-10 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mx-auto max-w-screen-2xl">
          {/* Mobile: count + Filters button */}
          <div className="flex items-center justify-between mb-4 md:hidden">
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

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
              <FiltersSidebar mode="desktop" />
            </div>

            {/* Product grid */}
            {products.length === 0 ? (
              <p className="text-white/80">No products found.</p>
            ) : (
              <div
                className="
                  grid gap-x-6 gap-y-10
                  grid-cols-[repeat(2,minmax(var(--card-w),1fr))]
                  md:grid-cols-[repeat(3,minmax(var(--card-w),1fr))]
                  lg:grid-cols-[repeat(4,minmax(var(--card-w),1fr))]
                "
              >
                {products.map((p) => {
                  const href = `/category/${encodeURIComponent(
                    categoryUi
                  )}/${encodeURIComponent(p.slug)}`;
                  return (
                    <ProductCard
                      key={p.slug}
                      slug={p.slug}
                      image={p.image}
                      name={p.name}
                      price={p.price}
                      salePrice={p.salePrice ?? null}
                      href={href}
                      inStock={p.inStock}
                      typeLabel={typeLabelFrom(p)}
                      categorySlug={categoryUi}
                      subcategorySlug={p.subcategory || null}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 📱 Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div id="filters-drawer" role="dialog" aria-modal="true" className="fixed inset-0 z-[100] md:hidden">
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
    </>
  );
}
