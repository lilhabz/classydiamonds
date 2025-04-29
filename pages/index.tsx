// 📄 pages/index.tsx - Home Page

"use client";

import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext"; // 🛒 Cart context
import { productsData } from "@/data/productsData"; // 💎 Featured products data

const Home = () => {
  const { addToCart } = useCart(); // 🛒 Cart hook

  return (
    <>
      <Head>
        <title>Classy Diamonds - Fine Jewelry</title>
        <meta
          name="description"
          content="Explore elegant engagement rings, wedding bands, and fine jewelry crafted by Classy Diamonds."
        />
      </Head>

      <main className="flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0]">
        {/* 🧹 Navbar Spacer */}
        <div className="h-0" />

        {/* 🌟 Hero Section */}
        <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden">
          {/* 🖼️ Hero Background Image */}
          <div className="absolute inset-0">
            {/* // 🖼️ Add hero background image here */}
            <img
              src="/hero-home.jpg"
              alt="Hero Background"
              className="w-full h-full object-cover"
            />
            {/* 🌑 Dark Overlay */}
            <div className="absolute inset-0 bg-black opacity-50" />
          </div>

          {/* ✨ Hero Text Content */}
          <div className="relative z-10 px-4">
            {/* // 📝 Edit hero headline here */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[#e0e0e0]">
              Timeless Elegance
            </h1>
            {/* // 📝 Edit hero subtext here */}
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-[#cfd2d6] mb-8">
              Discover handcrafted engagement rings, wedding bands, and fine
              jewelry built to last a lifetime.
            </p>
            {/* // 🛒 Edit hero button link here */}
            <Link href="/jewelry" className="inline-block">
              <button className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full text-lg font-semibold hover:bg-white hover:scale-105 transition-transform duration-300">
                Shop Now
              </button>
            </Link>
          </div>
        </section>

        {/* 💎 Featured Products Section */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          {/* // 🛒 Featured Products Title */}
          <h2 className="text-3xl font-semibold text-center mb-16">
            Featured Pieces
          </h2>

          {/* // 🛒 Featured Product Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12">
            {productsData.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300 flex flex-col cursor-pointer"
              >
                <Link
                  href={`/product/${item.slug}`}
                  className="flex-1 flex flex-col"
                >
                  {/* // 🖼️ Product Image */}
                  <div className="w-full h-80 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* // 📝 Product Name & Price */}
                  <div className="p-6 text-center flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold text-[#cfd2d6] group-hover:text-white transition-colors duration-300">
                        {item.name}
                      </h3>
                      <p className="mt-2 text-gray-400 group-hover:text-white transition-colors duration-300">
                        ${item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* // 🛒 Add to Cart Button */}
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

        {/* 🛍️ Shop by Category Section */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          {/* // 🛍️ Shop by Category Title */}
          <h2 className="text-3xl font-semibold text-center mb-16">
            Shop by Category
          </h2>

          {/* // 🛍️ Category Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 text-center">
            {[
              { name: "Engagement", image: "/category/engagement-cat.jpg" },
              {
                name: "Wedding Bands",
                image: "/category/wedding-band-cat.jpg",
              },
              { name: "Rings", image: "/category/ring-cat.jpg" },
              { name: "Bracelets", image: "/category/bracelet-cat.jpg" },
              { name: "Necklaces", image: "" },
              { name: "Earrings", image: "/category/earring-cat.jpg" },
            ].map((category) => (
              <Link
                key={category.name}
                href={`/category/${category.name
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
                className="group relative bg-[#25304f] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center h-40"
              >
                <div className="absolute inset-0">
                  {/* // 🖼️ Category Background Image */}
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {/* // 🌑 Category Dark Overlay */}
                  <div className="absolute inset-0 bg-black opacity-40" />
                </div>

                {/* // 📝 Category Label */}
                <span className="relative z-10 text-lg font-semibold text-[#cfd2d6] group-hover:text-white transition-colors">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 🎁 Gifts for Him & Her Section */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          {/* // 🎁 Gifts Title */}
          <h2 className="text-3xl font-semibold text-center mb-16">
            Gifts for Him & Her
          </h2>

          {/* // 🎁 Gift Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <Link href="/category/for-him">
              <div className="h-64 bg-[#25304f] rounded-2xl shadow-md hover:shadow-2xl flex items-center justify-center text-2xl font-semibold text-[#cfd2d6] hover:text-white transition-colors duration-300 hover:scale-105">
                Shop for Him
              </div>
            </Link>
            <Link href="/category/for-her">
              <div className="h-64 bg-[#25304f] rounded-2xl shadow-md flex items-center justify-center text-2xl font-semibold text-[#cfd2d6] hover:text-white transition-colors duration-300 hover:scale-105">
                Shop for Her
              </div>
            </Link>
          </div>
        </section>

        {/* 🛠️ About Section */}
        <section className="py-20 px-6 bg-[#1f2a44]">
          {/* // 🛠️ About Text */}
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-8">
              Craftsmanship You Can Trust
            </h2>
            <p className="text-lg text-[#cfd2d6]">
              With over 30 years of experience, Classy Diamonds is dedicated to
              delivering the finest quality jewelry. Every piece is a testament
              to our passion and precision.
            </p>
          </div>
        </section>

        {/* 💎 Why Choose Us Section */}
        <section className="py-20 px-6 bg-[#1f2a44]">
          {/* // 💎 Reasons Grid */}
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-10">
              Why Choose Classy Diamonds?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                "30+ Years of Custom Jewelry Expertise",
                "Independent Custom Jeweler",
                "One-of-a-Kind Designs",
                "Trusted Worldwide by Clients from London to Australia",
              ].map((reason) => (
                <div key={reason} className="flex items-center space-x-4">
                  <p className="text-lg text-[#cfd2d6]">{reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ✍️ Custom Work Section */}
        <section className="bg-[#25304f] py-20 px-6">
          {/* // ✍️ Custom Work Content */}
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">
              Bring Your Vision to Life
            </h2>
            <p className="text-lg text-[#cfd2d6] mb-8">
              With over 30 years of expertise, Ned at Classy Diamonds
              specializes in breathtaking custom jewelry. Whether it's an
              engagement ring, a one-of-a-kind pendant, or a meaningful
              redesign, every piece is made with precision and passion to tell
              your unique story.
            </p>
            <Link
              href="/custom"
              className="inline-block mt-6 px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-lg hover:bg-white hover:scale-105 transition-transform duration-300"
            >
              Start Your Custom Piece
            </Link>
          </div>
        </section>
      </main>
    </>
  );
};

export default Home;
