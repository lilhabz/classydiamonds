// 📄 pages/product/[slug].tsx – Dynamic Product Detail Page (SEO + Accessibility + Performance Optimized)

"use client";

import { useRouter } from "next/router";
import { productsData } from "@/data/productsData";
import { useCart } from "@/context/CartContext";
import Head from "next/head";
import Image from "next/image";

export default function ProductPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { addToCart } = useCart();

  if (!slug) {
    return null; // ⏳ Wait for the slug to be ready
  }

  // 🔍 Find the product by slug
  const product = productsData.find((item) => item.slug === slug);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0] items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
        <p className="text-lg text-gray-400">
          Sorry, we couldn't find that item.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 🧠 SEO Head Tags */}
      <Head>
        <title>{product.name} | Classy Diamonds</title>
        <meta name="description" content={product.description} />
        <meta name="robots" content="index, follow" />
        <meta
          property="og:title"
          content={`${product.name} | Classy Diamonds`}
        />
        <meta property="og:description" content={product.description} />
        <meta
          property="og:image"
          content={`https://classydiamonds.vercel.app${product.image}`}
        />
        <meta
          property="og:url"
          content={`https://classydiamonds.vercel.app/product/${product.slug}`}
        />
      </Head>

      {/* 💎 Page Container - Nav & Footer are global */}
      <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
        {/* 🚀 Hero Product Section */}
        <section className="-mt-20 pt-32 pb-16 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* 🖼 Product Image */}
          <div className="w-full md:w-1/2 overflow-hidden rounded-2xl shadow-lg">
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

          {/* 📜 Product Info */}
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <h1 className="text-4xl font-bold text-white">{product.name}</h1>
            <p className="text-lg text-[#cfd2d6]">{product.description}</p>
            <p className="text-2xl font-semibold text-white">
              ${product.price.toLocaleString()}
            </p>

            {/* 🛒 Add to Cart Button */}
            <button
              onClick={() =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.image,
                  quantity: 1,
                })
              }
              className="mt-4 px-8 py-4 bg-white text-[#1f2a44] rounded-full text-lg font-semibold hover:bg-gray-100 hover:scale-105 transition-transform duration-300"
            >
              Add to Cart
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
