import Link from "next/link";
import Head from 'next/head';

const Home = () => {
  return (
    <>
      <Head>
        <title>Classy Diamonds - Fine Jewelry</title>
        <meta name="description" content="Explore elegant engagement rings, wedding bands, and fine jewelry crafted by Classy Diamonds." />
      </Head>

      <main className="flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0]">

        
  {/* Navbar Spacer */}
  <div className="h-0" />

        {/* Hero Section */}
        <section className="border border-blue-500 flex flex-col items-center justify-center text-center bg-[#1f2a44] pt-32 pb-20 px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-[#e0e0e0]">
            Timeless Elegance
          </h1>
          <p className="text-lg md:text-xl max-w-2xl text-[#cfd2d6]">
            Discover handcrafted engagement rings, wedding bands, and fine jewelry built to last a lifetime.
          </p>
          <button className="mt-8 px-6 py-3 bg-[#e0e0e0] text-[#1f2a44] rounded-full text-lg hover:bg-gray-300 hover:scale-105 transition-transform duration-300">
            Shop Now
          </button>
        </section>

        {/* Featured Products */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12 text-[#e0e0e0]">Featured Pieces</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            {['ring1.jpg', 'necklace1.jpg', 'bracelet1.jpg'].map((image, index) => (
              <div key={index} className="bg-[#25304f] rounded-lg overflow-hidden shadow hover:shadow-2xl hover:scale-105 transition-transform duration-300">
                <div className="aspect-w-1 aspect-h-1">
                  <img src={`/${image}`} alt={image} className="object-cover w-full h-full" />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-[#e0e0e0]">Product {index + 1}</h3>
                  <p className="mt-2 text-gray-400">$Price</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shop by Category */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12 text-[#e0e0e0]">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 text-center">
            {[
              "Engagement", "Wedding Bands", "Rings", "Bracelets", "Necklaces", "Earrings"
            ].map((category) => (
              <Link 
                key={category} 
                href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-[#25304f] hover:bg-[#2f3b60] hover:scale-105 transition-transform duration-300 rounded-lg py-6 text-[#e0e0e0] text-lg font-medium hover:text-white"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>

        {/* Shop for Him & Her */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12 text-[#e0e0e0]">
            Gifts for Him & Her
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <Link href="/category/for-him" className="relative group">
              <div className="h-64 bg-[#25304f] rounded-lg flex items-center justify-center text-2xl text-[#e0e0e0] font-semibold group-hover:bg-[#2f3b60] group-hover:scale-105 transition-transform duration-300">
                Shop for Him
              </div>
            </Link>
            <Link href="/category/for-her" className="relative group">
              <div className="h-64 bg-[#25304f] rounded-lg flex items-center justify-center text-2xl text-[#e0e0e0] font-semibold group-hover:bg-[#2f3b60] group-hover:scale-105 transition-transform duration-300">
                Shop for Her
              </div>
            </Link>
          </div>
        </section>

        {/* About Section */}
        <section className="py-20 px-6 bg-[#1f2a44]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-6 text-[#e0e0e0]">Craftsmanship You Can Trust</h2>
            <p className="text-lg text-[#cfd2d6]">
              With over 30 years of experience, Classy Diamonds is dedicated to delivering the finest quality jewelry. Every piece is a testament to our passion and precision.
            </p>
          </div>
        </section>

        {/* Custom Work Section */}
        <section className="bg-[#25304f] py-20 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-[#e0e0e0] mb-6">
              Bring Your Vision to Life
            </h2>
            <p className="text-lg text-[#cfd2d6] mb-8">
              With over 30 years of expertise, Ned at Classy Diamonds specializes in crafting breathtaking custom jewelry. Whether it's an engagement ring, a one-of-a-kind pendant, or a meaningful redesign, every piece is made with precision and passion to tell your unique story.
            </p>
            <Link href="/custom" className="inline-block mt-6 px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-lg hover:bg-white hover:scale-105 transition-transform duration-300">
              Start Your Custom Piece
            </Link>
          </div>
        </section>

      </main>
    </>
  );
};

export default Home;
