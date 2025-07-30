// 📄 pages/category/[category]/[slug].tsx – Luxury Product Page for All Categories 💎

"use client";

import { GetServerSideProps } from "next";
import { useCart } from "@/context/CartContext";
import clientPromise from "@/lib/mongodb";
import Breadcrumbs from "@/components/Breadcrumbs";
import Head from "next/head";
import Image from "next/image";

// 🔢 Product type from database
type ProductType = {
  id: string;
  skuNumber?: number;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  slug: string;
  category: string;
  description?: string;
};

export default function ProductPage({ product }: { product: ProductType }) {
  const { addToCart } = useCart();

  const capitalizedCategory = product.category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      {/* 🧠 SEO */}
      <Head>
        <title>{product.name} | Classy Diamonds</title>
        <meta
          name="description"
          content={product.description || product.name}
        />
        <meta name="robots" content="index, follow" />
        <meta
          property="og:title"
          content={`${product.name} | Classy Diamonds`}
        />
        <meta
          property="og:description"
          content={product.description || product.name}
        />
        <meta
          property="og:image"
          content={`https://classydiamonds.vercel.app${product.image}`}
        />
        <meta
          property="og:url"
          content={`https://classydiamonds.vercel.app/category/${product.category}/${product.slug}`}
        />
      </Head>

      {/* 💎 Page */}
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
        {/* 🧭 Breadcrumb */}
        <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
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

        {/* 📦 Product Details – Unified Luxury Layout */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* 🖼 Product Image */}
          <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl bg-[var(--bg-nav)]">
            <Image
              src={product.image}
              alt={`Photo of ${product.name}`}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          {/* 📋 Product Info */}
          <div className="flex flex-col justify-center space-y-8">
            {/* 🏷 Title & SKU */}
            <div>
              <h1 className="text-5xl font-bold tracking-tight text-[var(--foreground)] mb-4">
                {product.name}
              </h1>
              {product.skuNumber && (
                <p className="text-sm text-gray-400">
                  SKU # {String(product.skuNumber).padStart(5, "0")}
                </p>
              )}
            </div>

            {/* 📝 Description */}
            <p className="text-lg leading-relaxed text-gray-300 max-w-prose">
              {product.description || "A timeless handcrafted piece."}
            </p>

            {/* 💲 Price */}
            <div className="text-3xl font-semibold">
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

            {/* 🛒 Add to Cart */}
            <button
              onClick={() =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  discountedPrice: product.salePrice,
                  image: product.image,
                  quantity: 1,
                })
              }
              className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] text-lg font-medium rounded-xl hover:scale-105 transition duration-300"
            >
              Add to Cart
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

// 📤 Server-side data fetching
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string;
  const client = await clientPromise;
  const p = await client.db().collection("products").findOne({ slug });
  if (!p) {
    return { notFound: true };
  }
  const product: ProductType = {
    id: p._id.toString(),
    skuNumber: p.skuNumber ?? null,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl,
    slug: p.slug,
    category: p.category,
    description: p.description || "",
  };
  return { props: { product } };
};
