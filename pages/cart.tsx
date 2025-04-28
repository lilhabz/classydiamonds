import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Head from "next/head";

export default function CartPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>Shopping Cart | Classy Diamonds</title>
        <meta
          name="description"
          content="View and manage your Classy Diamonds shopping cart."
        />
      </Head>

      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full h-[50vh] flex items-center justify-center text-center overflow-hidden -mt-20">
        <div className="absolute inset-0 bg-[#1f2a44]" />
        <div className="relative z-10 px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#e0e0e0]">
            Your Shopping Cart
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-[#cfd2d6]">
            Review your items and proceed to checkout when you're ready.
          </p>
        </div>
      </section>

      {/* Cart Items Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto w-full flex flex-col gap-12">
        {/* Example Cart Item */}
        <div className="flex flex-col md:flex-row gap-6 items-center bg-[#25304f] rounded-2xl p-6 shadow-md">
          {/* Product Image */}
          <div className="w-full md:w-1/4 h-40 overflow-hidden rounded-xl">
            <img
              src="/products/engagement-ring.jpg"
              alt="Diamond Engagement Ring"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col flex-1 text-center md:text-left">
            <h2 className="text-2xl font-semibold text-[#cfd2d6] mb-2">
              Diamond Engagement Ring
            </h2>
            <p className="text-lg text-gray-400">$4,200</p>
          </div>

          {/* Remove Button */}
          <button className="mt-4 md:mt-0 px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition">
            Remove
          </button>
        </div>

        {/* Cart Total */}
        <div className="flex flex-col gap-6 items-center">
          <p className="text-2xl font-semibold">Total: $4,200</p>
          <button className="px-10 py-4 bg-white text-[#1f2a44] rounded-full font-semibold text-lg hover:bg-gray-100 transition">
            Proceed to Checkout
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
