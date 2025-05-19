// 📄 pages/custom.tsx – Custom Jewelry Page (Optimized for Mobile + Hero LCP Fix + Footer Included)

import Head from "next/head";
import Image from "next/image";

import heroImage from "../public/hero-custom.jpg";

export default function CustomPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      {/* 🌐 Head Metadata */}
      <Head>
        <title>Custom Jewelry Design | Classy Diamonds</title>
        <meta
          name="description"
          content="Work one-on-one with Ned to design and create a unique piece of custom jewelry that tells your story."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* 🌟 Hero Section with Optimized LCP */}
      <section className="-mt-20 relative w-full h-[70vh] sm:h-[75vh] md:h-[80vh] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt="Custom Jewelry Background"
            fill
            priority
            placeholder="empty"
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 100vw"
          />
          <div className="absolute inset-0 bg-black opacity-50 pointer-events-none" />
        </div>

        <div className="relative z-10 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-[#e0e0e0]">
            Create Your Dream Piece
          </h1>
          <p className="text-base sm:text-lg md:text-xl max-w-2xl text-[#e0e0e0] mx-auto">
            Work one-on-one with Ned to design a piece that tells your unique
            story.
          </p>
        </div>
      </section>

      {/* 🧭 How It Works Section */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12 sm:mb-16">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {["Consultation", "Design Sketch", "Crafting", "Delivery"].map(
            (step, index) => (
              <div
                key={index}
                className="group bg-[#25304f] rounded-2xl shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6 sm:p-8 text-center hover:cursor-pointer"
              >
                <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[#cfd2d6] group-hover:text-white transition-colors">
                  {index + 1}. {step}
                </h3>
                <p className="text-[#cfd2d6] group-hover:text-white transition-colors text-sm sm:text-base">
                  {
                    [
                      "Meet with Ned to discuss your vision, style, and ideas.",
                      "Receive a detailed sketch tailored to your dream piece.",
                      "Watch your vision come to life with masterful craftsmanship.",
                      "Receive your custom piece, crafted to perfection.",
                    ][index]
                  }
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* 💎 Custom Creations Grid */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12 sm:mb-16">
          Custom Creations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="group bg-[#25304f] rounded-2xl shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center h-72 sm:h-80 hover:cursor-pointer"
            >
              <p className="text-base sm:text-lg text-[#cfd2d6] group-hover:text-white transition-colors">
                Custom Piece Coming Soon
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 📣 Call to Action */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8">
            Ready to Create Your Piece?
          </h2>
          <p className="text-base sm:text-lg text-[#cfd2d6] mb-6 sm:mb-8 leading-relaxed">
            Let's bring your vision to life. Reach out today to start designing
            your one-of-a-kind jewelry.
          </p>
          <a
            href="/contact#custom-form"
            className="inline-block px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-base sm:text-lg hover:bg-white hover:scale-105 transition-transform duration-300"
          >
            Start Your Custom Piece
          </a>
        </div>
      </section>
    </div>
  );
}
