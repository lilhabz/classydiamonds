import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function CustomPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full pt-[120px] pb-16 text-center px-4 -mt-20">
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold mb-6">
          Create Your Dream Piece
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto text-base sm:text-lg">
          Work one-on-one with Ned to design a piece that tells your unique story.
        </p>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          {/* Step 1 */}
          <div className="bg-[#25304f] p-6 rounded-2xl shadow-md hover:shadow-2xl transition-transform duration-300 hover:scale-105">
            <h3 className="text-xl font-semibold mb-4">1. Consultation</h3>
            <p className="text-[#cfd2d6] text-base">
              Meet with Ned to discuss your vision, style, and ideas.
            </p>
          </div>
          {/* Step 2 */}
          <div className="bg-[#25304f] p-6 rounded-2xl shadow-md hover:shadow-2xl transition-transform duration-300 hover:scale-105">
            <h3 className="text-xl font-semibold mb-4">2. Design Sketch</h3>
            <p className="text-[#cfd2d6] text-base">
              Receive a detailed sketch tailored to your dream piece.
            </p>
          </div>
          {/* Step 3 */}
          <div className="bg-[#25304f] p-6 rounded-2xl shadow-md hover:shadow-2xl transition-transform duration-300 hover:scale-105">
            <h3 className="text-xl font-semibold mb-4">3. Crafting</h3>
            <p className="text-[#cfd2d6] text-base">
              Watch your vision come to life with masterful craftsmanship.
            </p>
          </div>
          {/* Step 4 */}
          <div className="bg-[#25304f] p-6 rounded-2xl shadow-md hover:shadow-2xl transition-transform duration-300 hover:scale-105">
            <h3 className="text-xl font-semibold mb-4">4. Delivery</h3>
            <p className="text-[#cfd2d6] text-base">
              Receive your custom piece, crafted to perfection.
            </p>
          </div>
        </div>
      </section>

      {/* Custom Creations Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold text-center mb-12">Custom Creations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12">
          {/* Placeholder 1 */}
          <div className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 transition-transform duration-300 flex items-center justify-center h-80">
            <p className="text-[#cfd2d6] text-lg">Custom Piece Coming Soon</p>
          </div>
          {/* Placeholder 2 */}
          <div className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 transition-transform duration-300 flex items-center justify-center h-80">
            <p className="text-[#cfd2d6] text-lg">Custom Piece Coming Soon</p>
          </div>
          {/* Placeholder 3 */}
          <div className="group bg-[#25304f] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 transition-transform duration-300 flex items-center justify-center h-80">
            <p className="text-[#cfd2d6] text-lg">Custom Piece Coming Soon</p>
          </div>
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

      <Footer />
    </div>
  );
}
