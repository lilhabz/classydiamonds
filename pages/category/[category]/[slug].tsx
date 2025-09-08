// 📄 pages/category/[category]/[slug].tsx – Text Ring Size + Availability + Robust Image Src (synced button style)
// + Breadcrumb category crumb now links to correct ring subcategory routes (e.g., /category/ring/signet-rings)

"use client";

import { GetServerSideProps } from "next";
import { useCart } from "@/context/CartContext";
import clientPromise from "@/lib/mongodb";
import Breadcrumbs from "@/components/Breadcrumbs";
import Head from "next/head";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { productsData } from "@/data/productsData";
import { toRouteSubcategory } from "@/lib/taxonomy"; // ⬅️ NEW: use storefront slug mapping

type ProductType = {
  id: string;
  skuNumber?: number | null;
  name: string;
  price: number;
  salePrice?: number | null;
  image?: string; // can be local path or remote (Cloudinary)
  slug: string;
  category: string;
  subcategory?: string | null; // ✅ optional; safe if absent
  inStock?: boolean | null; // 🆕 real stock flag
};

const PLACEHOLDER = "/gray-placeholder.jpg"; // must exist in /public

function normalizeLocalPath(src: string) {
  const trimmed = src.trim();
  if (!trimmed) return PLACEHOLDER;
  if (trimmed.startsWith("http")) return trimmed; // handled elsewhere

  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (!withSlash.startsWith("/products/")) {
    return `/products/${withSlash.replace(/^\//, "")}`;
  }
  return withSlash;
}

function squareCloudinary(url: string) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("cloudinary.com")) return url;
    return url.replace(
      "/upload/",
      "/upload/c_fill,ar_1:1,w_1000,h_1000,f_auto,q_auto/"
    );
  } catch {
    return url;
  }
}

function resolveImageSrc(product: ProductType) {
  const fromDb = product.image?.trim() || "";
  const fromStatic =
    productsData.find((i) => i.slug === product.slug)?.image?.trim() || "";

  const chosen = fromDb || fromStatic || PLACEHOLDER;

  if (chosen.startsWith("http")) {
    return squareCloudinary(chosen);
  }
  return normalizeLocalPath(chosen);
}

// ✅ Robust detector: triggers for all ring categories/subcategories, never “earrings”
function isRingish(category?: string | null, subcategory?: string | null) {
  const c = (category || "").toLowerCase();
  const s = (subcategory || "").toLowerCase();
  const ringWord = /\brings?\b/; // whole-word ring/rings only
  if (ringWord.test(c) || ringWord.test(s)) return true;

  // Common ring families (extend any time without UI changes)
  const families =
    /\b(engagement|wedding-?bands?|promise|signet|stack(?:ing)?|anniversary)\b/;

  return families.test(c) || families.test(s);
}

// Pretty label for subcategory slugs like "signet-rings" -> "Signet Rings"
function prettySubLabel(routeSub?: string | null) {
  if (!routeSub) return "";
  if (routeSub.endsWith("-rings")) {
    const base = routeSub.replace(/-rings$/, "");
    return base.replace(/(^|[-\s])\w/g, (m) => m.toUpperCase()).replace(/-/g, " ") + " Rings";
  }
  return routeSub.replace(/(^|[-\s])\w/g, (m) => m.toUpperCase()).replace(/-/g, " ");
}

export default function ProductPage({ product }: { product: ProductType }) {
  const { addToCart } = useCart();
  const [ringSize, setRingSize] = useState("");
  const [imgSrc, setImgSrc] = useState<string>("");

  // 🔒 Only rings (incl. ring subcategories) need size
  const needsRingSize = useMemo(
    () => isRingish(product.category, product.subcategory),
    [product.category, product.subcategory]
  );

  const capitalizedCategory = useMemo(
    () =>
      product.category
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    [product.category]
  );

  const resolvedSrc = useMemo(() => resolveImageSrc(product), [product]);

  // 🧭 Route subcategory slug for storefront (e.g., "signet" -> "signet-rings", "wedding-bands" -> "wedding-rings")
  const routeSub = useMemo(
    () => toRouteSubcategory(product.category, product.subcategory ?? null),
    [product.category, product.subcategory]
  );

  // 🎯 Breadcrumb category crumb: if ring with a recognized sub, show/link to that subcategory page
  const categoryCrumbLabel = useMemo(() => {
    if (product.category === "ring" && routeSub) {
      return prettySubLabel(routeSub);
    }
    return capitalizedCategory;
  }, [product.category, routeSub, capitalizedCategory]);

  const categoryCrumbPath = useMemo(() => {
    if (product.category === "ring" && routeSub) {
      return `/category/ring/${routeSub}`;
    }
    return `/category/${product.category}`;
  }, [product.category, routeSub]);

  // ✅ set image src safely when it changes
  useEffect(() => {
    setImgSrc(resolvedSrc || PLACEHOLDER);
  }, [resolvedSrc]);

  const handleAddToCart = () => {
    if (!product.inStock) return; // guard
    if (needsRingSize && !ringSize.trim()) {
      alert("Please enter a ring size before adding to cart.");
      return;
    }

    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      discountedPrice: product.salePrice ?? undefined,
      image: imgSrc || PLACEHOLDER,
      quantity: 1,
      size: needsRingSize ? ringSize.trim() : undefined, // ✅ only attach for rings
    });
  };

  const StockPill = ({ inStock }: { inStock?: boolean | null }) => {
    const ok = !!inStock;
    return (
      <span
        className={
          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium " +
          (ok
            ? "bg-green-500/15 text-green-300 border border-green-500/30"
            : "bg-red-500/15 text-red-300 border border-red-500/30")
        }
      >
        {ok ? "In Stock" : "Out of Stock"}
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>{product.name} | Classy Diamonds</title>
        <meta name="description" content={product.name} />
        <meta property="og:image" content={imgSrc || PLACEHOLDER} />
      </Head>

      <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
        {/* 🔗 Breadcrumbs */}
        <div className="px-4 sm:px-8 mt-6 mb-6">
          <Breadcrumbs
            customLabels={{
              [product.category]: categoryCrumbLabel, // may display "Signet Rings" / "Wedding Rings"
              [product.slug]: product.name,
            }}
            customPaths={{
              [product.category]: categoryCrumbPath, // links to /category/ring/{routeSub} when applicable
              [product.slug]: `/category/${product.category}/${product.slug}`,
            }}
          />
        </div>

        {/* 📦 Main Product Section */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* 🖼 Product Image */}
          <div className="relative w-full max-w-[500px] aspect-square mx-auto rounded-2xl overflow-hidden shadow-2xl bg-[var(--bg-nav)] sm:w-[400px] md:w-[500px]">
            {imgSrc && (
              <Image
                src={imgSrc}
                alt={`Photo of ${product.name}`}
                fill
                className="object-cover"
                priority
                sizes="(min-width: 1024px) 500px, 90vw"
                onError={() => setImgSrc(PLACEHOLDER)}
              />
            )}
          </div>

          {/* 📄 Product Info */}
          <div className="flex flex-col justify-center space-y-8">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-3">
                {product.skuNumber && (
                  <p className="text-sm text-gray-400">
                    Item Number: {String(product.skuNumber).padStart(5, "0")}
                  </p>
                )}
                {/* 🆕 Stock pill */}
                <StockPill inStock={product.inStock} />
              </div>
            </div>

            {/* 💰 Price Display */}
            <div className="text-2xl sm:text-3xl font-semibold">
              {product.salePrice ? (
                <>
                  <span className="line-through mr-3 text-gray-400">
                    ${product.price.toLocaleString()}
                  </span>
                  <span className="text-green-500">
                    ${product.salePrice.toLocaleString()}
                  </span>
                </>
              ) : (
                <>${product.price.toLocaleString()}</>
              )}
            </div>

            {/* 🆕 Rings: free-text size instead of dropdown */}
            {needsRingSize && (
              <div>
                <label
                  htmlFor="ringSize"
                  className="block mb-2 font-medium text-gray-200"
                >
                  Enter Ring Size<span className="text-red-500">*</span>
                </label>
                <input
                  id="ringSize"
                  type="text"
                  value={ringSize}
                  onChange={(e) => setRingSize(e.target.value)}
                  placeholder="e.g., 6, 6.5, 7, or custom"
                  className="w-full px-3 py-2 bg-[var(--bg-nav)] border border-gray-500 rounded-lg text-white"
                  required
                  disabled={!product.inStock}
                />
                <p className="text-xs opacity-70 mt-1">
                  Half sizes are OK (e.g., 6.5). If unsure, type “Help me size”
                  and we’ll reach out.
                </p>
              </div>
            )}

            {/* ✅ Availability / notice */}
            <div className="text-sm md:text-base leading-relaxed bg-[var(--bg-nav)]/60 border border-[var(--bg-nav)] rounded-xl p-4">
              {product.inStock ? (
                <>
                  <strong>Items are subject to availability.</strong> Some
                  pieces are made to order &amp; can take up to 8 weeks for
                  production. You will receive an email within 48 hours with any
                  delivery delays that are outside standard processing time.
                </>
              ) : (
                <>
                  <strong>Currently out of stock.</strong> Many pieces can be
                  made to order (up to ~8 weeks). Use the contact page to
                  request a custom order or timeline, and we’ll follow up within
                  48 hours.
                </>
              )}
            </div>

            {/* 🛒 Add to Cart — disabled if out of stock */}
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className={
                "mt-1 w-full rounded-xl px-4 py-2.5 text-sm md:text-base font-semibold backdrop-blur " +
                (product.inStock
                  ? "bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                  : "bg-white/5 text-white/50 cursor-not-allowed")
              }
              aria-label={
                product.inStock ? `Add ${product.name} to cart` : "Out of stock"
              }
              aria-disabled={!product.inStock}
            >
              {product.inStock ? "Add to Cart" : "Out of Stock"}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string;
  const client = await clientPromise;
  const p = await client.db().collection("products").findOne({ slug });
  if (!p) return { notFound: true };

  // 🧠 Derive a robust inStock boolean from several possible fields:
  // - boolean: inStock / stock
  // - numeric: quantity > 0
  // - default: true (to avoid hiding legacy items)
  const inferredInStock =
    typeof p.inStock === "boolean"
      ? p.inStock
      : typeof p.stock === "boolean"
      ? p.stock
      : typeof p.quantity === "number"
      ? p.quantity > 0
      : true;

  const product: ProductType = {
    id: p._id.toString(),
    skuNumber: p.skuNumber ?? null,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image || "", // can be local path or remote URL
    slug: p.slug,
    category: String(p.category || "").toLowerCase(),
    subcategory: p.subcategory ? String(p.subcategory).toLowerCase() : null, // ✅ optional
    inStock: inferredInStock, // 🆕
  };

  return { props: { product } };
};
