// 📄 pages/index.tsx – Home Page with Responsive Featured Placement 💎✅

"use client";

import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import { GetServerSideProps } from "next";
import { useCart } from "@/context/CartContext";
import clientPromise from "@/lib/mongodb";
import { useRouter } from "next/router";

// 🔷 OPTION 2 (static fallback) requires this import:
// import { productsData as staticFeatured } from "@/data/productsData";

interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  slug: string;
}

interface HomeProps {
  products: Product[];
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  // ---------------------------------------------
  // 🎯 OPTION 1: DATABASE-DRIVEN FEATURED
  //    - Fetch only those products in MongoDB marked { featured: true }
  //    - Make sure your “products” collection has documents with featured: true!
  //    - If none are marked, the array will be empty (so “Featured” disappears).
  // ---------------------------------------------
  const client = await clientPromise;
  const db = client.db();
  const featuredDocs = await db
    .collection("products")
    .find({ featured: true })
    .limit(4)
    .toArray();

  const products: Product[] = featuredDocs.map((doc: any) => ({
    _id: doc._id.toString(),
    name: doc.name,
    price: doc.price,
    salePrice: doc.salePrice ?? null,
    image: doc.imageUrl || doc.image,
    category: doc.category,
    slug: doc.slug,
  }));

  // ---------------------------------------------
  // 🎯 OPTION 2: STATIC FALLBACK (uncomment if you prefer using hard-coded data)
  //    const staticFeaturedItems = staticFeatured.slice(0, 4).map(item => ({
  //      _id: item.id.toString(),
  //      name: item.name,
  //      price: item.price,
  //      image: item.image,
  //      category: item.category,
  //      slug: item.slug,
  //    }));
  //    return { props: { products: staticFeaturedItems } };
  // ---------------------------------------------

  return { props: { products } };
};

export default function Home({ products }: HomeProps) {
  const { addToCart } = useCart();
  const featured = products;

  type Gift = { name: string; image: string };

  function GiftButton({ gift, index }: { gift: Gift; index: number }) {
    const router = useRouter();
    return (
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(
            "preselectedCategory",
            gift.name.toLowerCase().replace(/\s+/g, "-")
          );
          router.push("/jewelry");
        }}
        className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transition-transform duration-300 cursor-pointer"
      >
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={gift.image}
            alt={gift.name}
            fill
            priority={index < 1}
            className="object-cover rounded-xl group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 z-10" />
          <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-semibold text-white z-20">
            {gift.name}
          </span>
        </div>
      </button>
    );
  }

  return (
    <>
      <Head>
        <title>Classy Diamonds - Fine Jewelry</title>
        <meta
          name="description"
          content="Explore elegant engagement rings, wedding bands, and fine jewelry."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="flex flex-col min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] overflow-x-hidden">
        {/* ⭐ Hero Section */}
        <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
          <Image
            src="/hero-home.jpg"
            alt="Hero"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 text-center px-4">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-[#e0e0e0] mb-6">
              Timeless Elegance
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-[#e0e0e0] mb-8 max-w-2xl mx-auto">
              Discover handcrafted engagement rings, wedding bands, and fine
              jewelry.
            </p>
            <Link href={{ pathname: "/jewelry", query: { scroll: "true" } }}>
              <button className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full hover:scale-105 transition">
                Shop Now
              </button>
            </Link>
          </div>
        </section>

        {/* 🛍️ Mobile-Only Category Icons */}
        <section className="sm:hidden px-4 mt-6 mb-8">
          <div className="overflow-x-auto">
            <div className="flex space-x-6 w-max py-2">
              {[
                { name: "Engagement", icon: "/icons/wedding-ring.svg" },
                { name: "Wedding Bands", icon: "/icons/wedding-bands.svg" },
                { name: "Rings", icon: "/icons/rings.svg" },
                { name: "Bracelets", icon: "/icons/bracelets.svg" },
                { name: "Necklaces", icon: "/icons/necklaces.svg" },
                { name: "Earrings", icon: "/icons/earrings.svg" },
              ].map((cat) => (
                <Link
                  key={cat.name}
                  href={{
                    pathname: "/jewelry",
                    query: {
                      category: cat.name.toLowerCase().replace(/\s+/g, "-"),
                      scroll: "true",
                    },
                  }}
                  className="flex-shrink-0 text-center"
                  aria-label={cat.name}
                >
                  <img src={cat.icon} alt="" className="w-16 h-16 mx-auto" />
                  <p className="mt-2 text-sm text-white">{cat.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 🛍️ Mobile-Only “Featured” Below Categories */}
        <section className="sm:hidden px-4 mt-6 mb-8">
          <h2 className="text-2xl font-semibold text-center mb-2 text-white">
            Featured Pieces
          </h2>
          <div className="overflow-x-auto">
            <div className="flex space-x-6 w-max py-2">
              {featured.length === 0 ? (
                <p className="text-white text-center w-full">
                  No featured items to display.
                </p>
              ) : (
                featured.map((item) => (
                  <div
                    key={item._id}
                    className="flex-shrink-0 w-48 bg-[#25304f] rounded-2xl shadow-lg"
                  >
                    <Link href={`/category/${item.category}/${item.slug}`}>
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={192}
                        height={192}
                        className="rounded-t-2xl object-cover"
                      />
                    </Link>
                    <div className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-[#cfd2d6] truncate">
                        {item.name}
                      </h3>
                      <p className="text-gray-400 text-xs mb-2">
                        {item.salePrice ? (
                          <>
                            <span className="line-through mr-1">
                              ${item.price.toLocaleString()}
                            </span>
                            <span className="text-red-500">
                              ${item.salePrice.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <>${item.price.toLocaleString()}</>
                        )}
                      </p>
                      <button
                        onClick={() =>
                          addToCart({
                            id: item._id,
                            name: item.name,
                            price: item.price,
                            image: item.image,
                            quantity: 1,
                          })
                        }
                        className="px-3 py-2 bg-[#e0e0e0] text-[#1f2a44] rounded-xl text-sm hover:scale-105 transition"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 🖥️ Desktop-Only “Featured” Above Categories */}
        <section className="hidden sm:block py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold text-center mb-8">
            Featured Pieces
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
            {featured.length === 0 ? (
              <p className="text-white text-center col-span-4">
                No featured items to display.
              </p>
            ) : (
              featured.map((item) => (
                <div
                  key={item._id}
                  className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition"
                >
                  <Link href={`/category/${item.category}/${item.slug}`}>
                    <div className="relative w-full h-72">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-110 transition"
                      />
                    </div>
                  </Link>
                  <div className="p-6 text-center">
                    <h3 className="text-xl text-[#cfd2d6] mb-2 group-hover:text-white transition">
                      {item.name}
                    </h3>
                    <p className="text-gray-400 mb-4 group-hover:text-white transition">
                      {item.salePrice ? (
                        <>
                          <span className="line-through mr-1">
                            ${item.price.toLocaleString()}
                          </span>
                          <span className="text-red-500">
                            ${item.salePrice.toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <>${item.price.toLocaleString()}</>
                      )}
                    </p>
                    <button
                      onClick={() =>
                        addToCart({
                          id: item._id,
                          name: item.name,
                          price: item.price,
                          image: item.image,
                          quantity: 1,
                        })
                      }
                      className="px-6 py-3 bg-[#e0e0e0] text-[#1f2a44] rounded-xl hover:scale-105 transition"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 🛍️ Desktop-Only Category Grid */}
        <section className="hidden sm:block py-16 sm:py-20 w-full px-4 sm:px-10">
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
                href={{
                  pathname: "/jewelry",
                  query: {
                    category: category.name.toLowerCase().replace(/\s+/g, "-"),
                    scroll: "true",
                  },
                }}
                className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transition-transform duration-300"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
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

        {/* 🎁 Gifts for Him & Her Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-10 w-full">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12 sm:mb-16">
            Gifts for Him & Her
          </h2>
          <div className="grid grid-cols-2 gap-4 justify-center max-w-2xl mx-auto">
            {[
              { name: "For Him", image: "/category/his-gift-cat.jpg" },
              { name: "For Her", image: "/category/her-gift-cat.jpg" },
            ].map((gift, index) => (
              <GiftButton key={gift.name} gift={gift} index={index} />
            ))}
          </div>
        </section>

        {/* 🛠️ About Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 --bg-page">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8">
              Craftsmanship You Can Trust
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] leading-relaxed">
              Classy Diamonds was founded on a promise: to create jewelry that
              stands the test of time. Every piece we offer is designed with
              precision, built from premium materials, and backed by a legacy of
              trust. This isn’t just jewelry — it’s generational craftsmanship
              you can count on.
            </p>
          </div>
        </section>

        {/* 💎 Why Choose Us Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 --bg-page">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-10">
              Why Choose Classy Diamonds?
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] leading-relaxed">
              With over 30 years in the jewelry industry, we’ve built our name
              on excellence, independence, and unmatched attention to detail.
              Our clients—from London to Australia—choose us because we deliver
              personal service, ethical sourcing, and timeless beauty in every
              creation.
            </p>
          </div>
        </section>

        {/* ✍️ Custom Jewelry CTA */}
        <section className="--bg-page py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8">
              Bring Your Vision to Life
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] mb-8 leading-relaxed">
              Whether you’re imagining a one-of-a-kind engagement ring or
              redesigning a meaningful family heirloom, Ned brings decades of
              expertise to every detail. At Classy Diamonds, custom jewelry
              isn’t just made — it’s imagined with you, for you, and crafted by
              hand with heart.
            </p>
            <Link
              href="/custom"
              className="inline-block mt-4 px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-base sm:text-lg hover:bg-white hover:scale-105 transition-transform duration-300"
            >
              Start Your Custom Piece
            </Link>
          </div>
        </section>

        {/* 🧩 Tailwind Purge Safeguard for Swipe Snap */}
        <div className="hidden hidden-scroll-snap-include" />
      </main>
    </>
  );
}
