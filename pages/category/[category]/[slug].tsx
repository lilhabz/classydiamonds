// 📄 pages/category/[category]/[slug].tsx – Final Product Page with Live MongoDB Data + Breadcrumb Fix ✅

"use client";

import { GetServerSideProps } from "next"; // added for data fetching
import { useCart } from "@/context/CartContext";
import clientPromise from "@/lib/mongodb"; // added to connect to MongoDB
import Breadcrumbs from "@/components/Breadcrumbs";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router"; // keep client-side router if needed

// 🔢 Product type from database
type ProductType = {
  id: string; // _id from MongoDB as string
  skuNumber?: number;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  slug: string;
  category: string;
  gender?: "unisex" | "him" | "her";
  description?: string;
};

export default function ProductPage({ product }: { product: ProductType }) {
  const { addToCart } = useCart();
  // const router = useRouter(); // not needed for server props lookup

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

        {/* 📦 Product Details */}
        <section className="pt-10 pb-16 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* 🖼 Product Image */}
          <div className="w-full md:w-1/2 overflow-hidden rounded-2xl shadow-lg bg-[var(--bg-nav)]">
            <Image
              src={product.image}
              alt={`Photo of ${product.name}`}
              width={600}
              height={600}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover w-full h-full"
              priority
            />
          </div>

          {/* 📋 Product Info */}
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <h1 className="text-4xl font-bold text-[var(--foreground)]">
              {product.name}
            </h1>
            {product.skuNumber !== undefined && (
              <p className="text-sm text-gray-400">
                SKU # {String(product.skuNumber).padStart(5, "0")}
              </p>
            )}
            <p className="text-lg text-[#cfd2d6]">
              {product.description || "Beautiful handcrafted piece."}
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {product.salePrice ? (
                <>
                  <span className="line-through mr-2 text-xl">
                    ${product.price.toLocaleString()}
                  </span>
                  <span className="text-green-500">
                    ${product.salePrice.toLocaleString()}
                  </span>
                </>
              ) : (
                <>${product.price.toLocaleString()}</>
              )}
            </p>

            <button
              onClick={() =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  price: product.price, // ← original price (e.g. $13)
                  discountedPrice: product.salePrice, // ← sale price (e.g. $10), or undefined
                  image: product.image,
                  quantity: 1,
                })
              }
              className="mt-4 px-6 py-3 bg-[#e0e0e0] text-[#1f2a44] rounded-xl hover:scale-105 transition"
            >
              Add to Cart
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

// 📤 Server-side data fetching for single product
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
    gender: p.gender || "unisex",
    description: p.description || "",
  };
  return { props: { product } };
};
