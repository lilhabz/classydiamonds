"use client";

import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import clientPromise from "@/lib/mongodb";
import Breadcrumbs from "@/components/Breadcrumbs";

export type WatchProduct = {
  id: string;
  skuNumber?: number;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  slug: string;
  description?: string;
};

export default function WatchPage({ product }: { product: WatchProduct }) {
  const { addToCart } = useCart();

  return (
    <>
      <Head>
        <title>{product.name} | Classy Diamonds</title>
        <meta name="description" content={product.description || product.name} />
      </Head>
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
        <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
          <Breadcrumbs
            customLabels={{ watches: "Watches", [product.slug]: product.name }}
            customPaths={{ watches: "/watches", [product.slug]: `/watches/${product.slug}` }}
          />
        </div>
        <section className="pt-10 pb-16 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
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
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <h1 className="text-4xl font-bold text-[var(--foreground)]">{product.name}</h1>
            {product.skuNumber !== undefined && (
              <p className="text-sm text-gray-400">SKU # {String(product.skuNumber).padStart(5, "0")}</p>
            )}
            <p className="text-lg text-[#cfd2d6]">{product.description || "Beautiful handcrafted timepiece."}</p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {product.salePrice ? (
                <>
                  <span className="line-through mr-2 text-xl">${product.price.toLocaleString()}</span>
                  <span className="text-green-500">${product.salePrice.toLocaleString()}</span>
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
                  price: product.price,
                  discountedPrice: product.salePrice,
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

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string;
  const client = await clientPromise;
  const p = await client.db().collection("products").findOne({ slug });
  if (!p) {
    return { notFound: true };
  }
  const product: WatchProduct = {
    id: p._id.toString(),
    skuNumber: p.skuNumber ?? null,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image,
    slug: p.slug,
    description: p.description || "",
  };
  return { props: { product } };
};
