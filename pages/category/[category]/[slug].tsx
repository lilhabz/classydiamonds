// 📄 pages/category/[category]/[slug].tsx – Text Ring Size + Availability + Robust Image Src

"use client";

import { GetServerSideProps } from "next";
import { useCart } from "@/context/CartContext";
import clientPromise from "@/lib/mongodb";
import Breadcrumbs from "@/components/Breadcrumbs";
import Head from "next/head";
import Image from "next/image";
import { useMemo, useState } from "react";
import { productsData } from "@/data/productsData";

type ProductType = {
  id: string;
  skuNumber?: number | null;
  name: string;
  price: number;
  salePrice?: number | null;
  image?: string; // can be local path or remote (Cloudinary)
  slug: string;
  category: string;
};

const PLACEHOLDER = "/gray-placeholder.jpg"; // must exist in /public

function normalizeLocalPath(src: string) {
  // Ensure it starts with a leading slash and points into /products
  // Example DB values like "products/round-brilliant.jpg" or "/products/round-brilliant.jpg"
  const trimmed = src.trim();
  if (!trimmed) return PLACEHOLDER;

  if (trimmed.startsWith("http")) return trimmed; // handled elsewhere

  // Guarantee leading slash
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  // If user stored only filename like "round-brilliant.jpg", force it into /products
  if (!withSlash.startsWith("/products/")) {
    return `/products/${withSlash.replace(/^\//, "")}`;
  }
  return withSlash;
}

function squareCloudinary(url: string) {
  // Inject a square transform only if it's a Cloudinary URL without an existing/compatible transform in that segment.
  // We’ll add a common, safe preset.
  // Example: https://res.cloudinary.com/xxx/image/upload/.../file.jpg
  try {
    const u = new URL(url);
    if (!u.hostname.includes("cloudinary.com")) return url;

    // Only modify the /upload/ segment once
    const replaced = url.replace(
      "/upload/",
      "/upload/c_fill,ar_1:1,w_1000,h_1000,f_auto,q_auto/"
    );
    return replaced;
  } catch {
    return url;
  }
}

function resolveImageSrc(product: ProductType) {
  // Priority: product.image -> productsData fallback (by slug) -> PLACEHOLDER
  const fromDb = product.image?.trim() || "";
  const fromStatic =
    productsData.find((i) => i.slug === product.slug)?.image?.trim() || "";

  const chosen = fromDb || fromStatic || PLACEHOLDER;

  if (chosen.startsWith("http")) {
    // Likely Cloudinary or other remote; add square transform for Cloudinary
    return squareCloudinary(chosen);
  }

  // Local path case
  return normalizeLocalPath(chosen);
}

export default function ProductPage({ product }: { product: ProductType }) {
  const { addToCart } = useCart();
  const [ringSize, setRingSize] = useState("");
  const [imgSrc, setImgSrc] = useState<string>("");

  const needsRingSize = /ring|engagement/i.test(product.category);

  const capitalizedCategory = useMemo(
    () =>
      product.category
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    [product.category]
  );

  const resolvedSrc = useMemo(() => resolveImageSrc(product), [product]);
  // Initialize img src once
  if (!imgSrc && resolvedSrc) {
    setImgSrc(resolvedSrc);
  }

  const handleAddToCart = () => {
    if (needsRingSize && !ringSize.trim()) {
      alert("Please enter a ring size before adding to cart.");
      return;
    }

    addToCart({
      id: product.id,
      slug: product.slug, // ✅ include slug
      name: product.name,
      price: product.price,
      discountedPrice: product.salePrice ?? undefined,
      image: imgSrc || PLACEHOLDER,
      quantity: 1,
      size: needsRingSize ? ringSize.trim() : undefined,
    });
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
              [product.category]: capitalizedCategory,
              [product.slug]: product.name,
            }}
            customPaths={{
              [product.category]: `/category/${product.category}`,
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
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                {product.name}
              </h1>
              {product.skuNumber && (
                <p className="text-sm text-gray-400">
                  Item Number: {String(product.skuNumber).padStart(5, "0")}
                </p>
              )}
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
                />
                <p className="text-xs opacity-70 mt-1">
                  Half sizes are OK (e.g., 6.5). If unsure, type “Help me size”
                  and we’ll reach out.
                </p>
              </div>
            )}

            {/* ✅ Availability / made-to-order notice above Add to Cart */}
            <div className="text-sm md:text-base leading-relaxed bg-[var(--bg-nav)]/60 border border-[var(--bg-nav)] rounded-xl p-4">
              <strong>Items are subject to availability.</strong> Some pieces
              are made to order &amp; can take up to 8 weeks for production. You
              will receive an email within 48 hours of placing order with any
              delivery delays, that are outside of standard processing time.
            </div>

            {/* 🛒 Add to Cart */}
            <button
              onClick={handleAddToCart}
              className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] text-lg rounded-xl hover:scale-105 transition"
            >
              Add to Cart
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

  const product: ProductType = {
    id: p._id.toString(),
    skuNumber: p.skuNumber ?? null,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image || "", // can be local path or remote URL
    slug: p.slug,
    category: p.category,
  };

  return { props: { product } };
};
