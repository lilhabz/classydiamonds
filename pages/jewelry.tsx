// 📄 pages/jewelry.tsx - Jewelry Collection Page

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext"; // 🛒 Hook into Cart

const products = [
  {
    id: 1,
    name: "Diamond Engagement Ring",
    price: "$4200",
    image: "/products/engagement-ring.jpg",
    href: "/product/engagement-ring",
  },
  {
    id: 2,
    name: "Gold Tennis Bracelet",
    price: "$1800",
    image: "/products/tennis-bracelet.jpg",
    href: "/product/tennis-bracelet",
  },
  {
    id: 3,
    name: "Sapphire Pendant Necklace",
    price: "$2500",
    image: "/products/sapphire-necklace.jpg",
    href: "/product/sapphire-necklace",
  },
  {
    id: 4,
    name: "Pearl Drop Earrings",
    price: "$950",
    image: "/products/pearl-earrings.jpg",
    href: "/product/pearl-earrings",
  },
];

export default function JewelryPage() {
  const { addToCart } = useCart(); // 🛒 Real Cart Hook

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>Jewelry Collection | Classy Diamonds</title>
        <meta
          name="description"
          content="Explore timeless engagement rings, wedding bands, necklaces, earrings, and more, crafted with passion at Classy Diamonds."
        />
      </Head>

      <Navbar />

      {/* 🌟 Hero Section */}
      <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden">
        {/* 🖼️ Background Image */}
        <div className="absolute inset-0">
          <img
            src="/hero-jewelry.jpg"
            alt="Jewelry Hero Background"
            className="w-full h-full object-cover"
          />
          {/* 🌑 Dark Overlay */}
          <div className="absolute inset-0 bg-black opacity-50" />
        </div>

        {/* ✨ Hero Content */}
        <div className="relative z-10 px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[#e0e0e0]">
            Jewelry Collection
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-[#cfd2d6]">
            Discover timeless pieces designed to capture every moment, crafted
            with passion and precision.
          </p>
        </div>
      </section>

      {/* 🛍️ Shop by Category */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-16">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 text-center">
          {[
            { href: "/engagement-rings", label: "Engagement" },
            { href: "/wedding-bands", label: "Wedding Bands" },
            { href: "/rings", label: "Rings" },
            { href: "/bracelets", label: "Bracelets" },
            { href: "/necklaces", label: "Necklaces" },
            { href: "/earrings", label: "Earrings" },
          ].map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center py-10 text-lg font-semibold text-[#cfd2d6] hover:text-white hover:cursor-pointer"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      {/* 💎 Our Jewelry Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-12">
          Our Jewelry
        </h2>
        <p className="text-center text-[#cfd2d6] max-w-2xl mx-auto mb-16 text-lg">
          Browse our exclusive collection of fine jewelry, meticulously crafted
          to celebrate life's most treasured moments.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">
          {products.map((product) => (
            <div key={product.id} className="group hover:cursor-pointer">
              <div className="bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-[#e0e0e0] hover:scale-105 transition-all duration-300 flex flex-col h-full">
                <div className="flex-1 flex flex-col">
                  <Link href={product.href} className="flex-1">
                    <div className="w-full h-80 overflow-hidden">
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={500}
                        height={500}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-6 text-center">
                      <h3 className="text-2xl font-semibold text-[#cfd2d6] group-hover:text-white transition-colors duration-300">
                        {product.name}
                      </h3>
                      <p className="mt-2 text-gray-400 group-hover:text-white transition-colors duration-300">
                        ${product.price}
                      </p>
                    </div>
                  </Link>
                </div>

                {/* 🛒 Add to Cart Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: Number(
                          product.price.replace("$", "").replace(",", "")
                        ),
                        image: product.image,
                        quantity: 1,
                      });
                    }}
                    className="w-full px-6 py-3 bg-white text-[#1f2a44] rounded-xl font-semibold transition-all duration-300 transform hover:scale-110 hover:bg-gray-200 hover:font-bold cursor-pointer" // ✏️ Added cursor-pointer here
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
