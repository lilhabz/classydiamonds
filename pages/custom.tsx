import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Head from 'next/head';

export default function CustomPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Head>
        <title>Custom Jewelry Design | Classy Diamonds</title>
        <meta name="description" content="Work one-on-one with Ned to design and create a unique piece of custom jewelry that tells your story." />
      </Head>

      <Navbar />

      {/* Hero Section */}
<section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden">
  
  {/* Background Image */}
  <div className="absolute inset-0">
    <img
      src="/hero-custom.jpg" // replace this with your custom page hero image
      alt="Custom Jewelry Hero Background"
      className="w-full h-full object-cover"
    />
    {/* Dark Overlay */}
    <div className="absolute inset-0 bg-black opacity-50" />
  </div>

  {/* Hero Content */}
  <div className="relative z-10 px-4">
    <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-[#e0e0e0]">
      Create Your Dream Piece
    </h1>
    <p className="text-lg md:text-xl max-w-2xl mx-auto text-[#cfd2d6]">
      Work one-on-one with Ned to design a piece that tells your unique story.
    </p>
  </div>

</section>

      {/* How It Works Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-16">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { title: "1. Consultation", desc: "Meet with Ned to discuss your vision, style, and ideas." },
            { title: "2. Design Sketch", desc: "Receive a detailed sketch tailored to your dream piece." },
            { title: "3. Crafting", desc: "Watch your vision come to life with masterful craftsmanship." },
            { title: "4. Delivery", desc: "Receive your custom piece, crafted to perfection." },
          ].map((step, index) => (
            <div key={index} className="group bg-[#25304f] rounded-2xl shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 p-8 text-center hover:cursor-pointer">
              <h3 className="text-xl font-semibold mb-4 text-[#cfd2d6] group-hover:text-white transition-colors">{step.title}</h3>
              <p className="text-[#cfd2d6] group-hover:text-white transition-colors">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Custom Creations Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-16">Custom Creations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="group bg-[#25304f] rounded-2xl shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center h-80 hover:cursor-pointer">
              <p className="text-lg text-[#cfd2d6] group-hover:text-white transition-colors">
                Custom Piece Coming Soon
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Call To Action Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-8">Ready to Create Your Piece?</h2>
          <p className="text-lg text-[#cfd2d6] mb-8">
            Let's bring your vision to life. Reach out today to start designing your one-of-a-kind jewelry.
          </p>
          <a
            href="/contact"
            className="inline-block px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] rounded-full font-semibold text-lg hover:bg-white hover:scale-105 transition-transform duration-300"
          >
            Start Your Custom Piece
          </a>
        </div>
      </section>
      
    </div>
  );
}
