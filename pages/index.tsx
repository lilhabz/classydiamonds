// 📄 pages/index.tsx – Cleaned & Desktop-Optimized ✅

"use client";

import Link from "next/link";
import Head from "next/head";
import Image from "next/image";

import { useCart } from "@/context/CartContext";
import { productsData } from "@/data/productsData";

const Home = () => {
  const { addToCart } = useCart();

  return (
    <>
      <Head>
        <title>Classy Diamonds - Fine Jewelry</title>
        <meta
          name="description"
          content="Explore elegant engagement rings, wedding bands, and fine jewelry crafted by Classy Diamonds."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0] overflow-x-hidden">
        <div className="h-0" />

        {/* 🌟 Hero Section (priority loaded for LCP) */}
        <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0">
            <div className="relative w-full h-full">
              <Image
                src="/hero-home.jpg"
                alt="Hero Background"
                fill
                priority // 🚀 Boost LCP score
                sizes="100vw"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-black opacity-50 pointer-events-none" />
          </div>

          <div className="relative z-10 px-4">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 text-[#e0e0e0]">
              Timeless Elegance
            </h1>
            <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto text-[#cfd2d6] mb-8">
              Discover handcrafted engagement rings, wedding bands, and fine
              jewelry built to last a lifetime.
            </p>
            <Link href="/jewelry" className="inline-block">
              <button className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full text-lg font-semibold hover:bg-white hover:scale-105 transition-transform duration-300">
                Shop Now
              </button>
            </Link>
          </div>
        </section>

        {/* 💎 Featured Products Section – Optimized */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12 sm:mb-16">
            Featured Pieces
          </h2>

          {/* 📱 Mobile Grid – Unchanged */}
          <div className="grid grid-cols-2 gap-4 sm:hidden px-2">
            {productsData.slice(0, 4).map((item, index) => (
              <div
                key={item.id}
                className="bg-[#25304f] rounded-2xl shadow-lg flex flex-col"
              >
                <Link
                  href={`/product/${item.slug}`}
                  className="flex-1 flex flex-col"
                >
                  <div className="relative w-full h-48">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="50vw"
                      priority={index === 0}
                      className="object-cover rounded-t-2xl"
                    />
                  </div>
                  <div className="p-4 text-center flex-1 flex flex-col justify-between">
                    <h3 className="text-sm font-semibold text-[#cfd2d6]">
                      {item.name}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      ${item.price.toLocaleString()}
                    </p>
                  </div>
                </Link>
                <div className="p-4 pt-0">
                  <button
                    onClick={() =>
                      addToCart({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        quantity: 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-white text-[#1f2a44] text-sm rounded-xl font-semibold hover:bg-gray-100 transition"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 🖥️ Desktop Grid – Optimized */}
          <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
            {productsData.slice(0, 6).map((item, index) => (
              <div
                key={item.id}
                className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300 flex flex-col cursor-pointer"
              >
                <Link
                  href={`/product/${item.slug}`}
                  className="flex-1 flex flex-col"
                >
                  <div className="relative w-full h-72 sm:h-80 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, 33vw"
                      priority={index < 3}
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6 text-center flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-[#cfd2d6] group-hover:text-white transition-colors duration-300">
                        {item.name}
                      </h3>
                      <p className="mt-2 text-gray-400 group-hover:text-white transition-colors duration-300">
                        ${item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="p-6 pt-0">
                  <button
                    onClick={() =>
                      addToCart({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        quantity: 1,
                      })
                    }
                    className="w-full px-6 py-3 bg-white text-[#1f2a44] rounded-xl font-semibold hover:bg-gray-100 transition hover:scale-105 cursor-pointer"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 🛍️ Shop by Category (Images optimized with sizes) */}
        <section className="py-16 sm:py-20 w-full px-4 sm:px-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12 sm:mb-16">
            Shop by Category
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Engagement", image: "/category/engagement-cat.jpg" },
              {
                name: "Wedding Bands",
                image: "/category/wedding-band-cat.jpg",
              },
              { name: "Rings", image: "/category/ring-cat.jpg" },
              { name: "Bracelets", image: "/category/bracelet-cat.jpg" },
              { name: "Necklaces", image: "/category/necklace-cat.jpg" },
              { name: "Earrings", image: "/category/earring-cat.jpg" },
            ].map((category, index) => (
              <Link
                key={category.name}
                href={`/category/${category.name
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
                className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transition-transform duration-300"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(min-width: 1024px) 16vw, 50vw"
                    priority={index < 3}
                    className="rounded-xl object-cover z-0"
                  />
                  <div className="absolute inset-0 bg-black/30 z-10" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-semibold text-white z-20">
                    {category.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 🎁 Gifts for Him & Her Section – Unchanged except priority/index */}
        <section className="py-16 sm:py-20 px-4 sm:px-10 w-full">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12 sm:mb-16">
            Gifts for Him & Her
          </h2>

          <div className="grid grid-cols-2 gap-4 justify-center max-w-2xl mx-auto">
            {[
              { name: "For Him", image: "/category/his-gift-cat.jpg" },
              { name: "For Her", image: "/category/her-gift-cat.jpg" },
            ].map((gift, index) => (
              <Link
                key={gift.name}
                href={`/category/${gift.name
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
                className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transition-transform duration-300"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={gift.image}
                    alt={gift.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    priority={index === 0}
                    className="object-cover z-0 rounded-xl group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 z-10" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-semibold text-white z-20">
                    {gift.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 📜 About / Why / CTA – No image, leave as-is */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#1f2a44]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8">
              Craftsmanship You Can Trust
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] leading-relaxed">
              Classy Diamonds was founded on a promise: to create jewelry that
              stands the test of time...
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#1f2a44]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-10">
              Why Choose Classy Diamonds?
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] leading-relaxed">
              With over 30 years in the jewelry industry...
            </p>
          </div>
        </section>

        {/* 🛠️ Custom CTA */}
        <section className="bg-[#1f2a44] py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8">
              Bring Your Vision to Life
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] mb-8 leading-relaxed">
              Whether you’re imagining a one-of-a-kind engagement ring...
            </p>
            <Link
              href="/custom"
              className="inline-block mt-4 px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-base sm:text-lg hover:bg-white hover:scale-105 transition-transform duration-300"
            >
              Start Your Custom Piece
            </Link>
          </div>
        </section>

        {/* 🚨 Vercel Purge Safe Class for Scroll */}
        <div className="hidden hidden-scroll-snap-include" />
      </main>
    </>
  );
};

export default Home;
