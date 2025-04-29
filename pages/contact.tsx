import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { FaPhoneAlt, FaEnvelope } from "react-icons/fa";

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden -mt-20">
        <div className="absolute inset-0">
          <img
            src="/hero-contact.jpg"
            alt="Contact Classy Diamonds Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black opacity-50" />
        </div>
        <div className="relative z-10 px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-[#e0e0e0]">
            Contact Classy Diamonds
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-[#cfd2d6]">
            Turning dreams into reality for nearly 30 years.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="w-full h-96 overflow-hidden rounded-2xl shadow-lg">
            <img
              src="/ned-photo.jpg"
              alt="Ned - Classy Diamonds"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-semibold mb-8">About Us</h2>
            <p className="text-lg text-[#cfd2d6] leading-relaxed">
              For nearly 30 years, Classy Diamonds has been providing superior
              quality and exceptional customer service to clients around the
              world. Ned is renowned for his meticulous custom design work,
              going above and beyond to create detailed, flawless pieces that
              bring his customers' dreams to life.
              <br />
              <br />
              His passion and dedication for fine craftsmanship are truly
              remarkable and never go unnoticed. With a global clientele
              spanning London, Quebec, Europe, and Australia, Ned is proud to
              build lifelong relationships and craft unforgettable moments
              through his jewelry.
              <br />
              <br />
              At Classy Diamonds, every piece tells a story — and we look
              forward to helping you tell yours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info + Map Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start">
              <FaPhoneAlt className="text-3xl mb-2" />
              <p className="text-lg">+1 (123) 456-7890</p>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <FaEnvelope className="text-3xl mb-2" />
              <p className="text-lg">info@classydiamonds.com</p>
            </div>
          </div>
          <div className="w-full h-64 bg-[#25304f] rounded-2xl overflow-hidden flex items-center justify-center">
            <p className="text-[#cfd2d6] text-center">Google Map Coming Soon</p>
          </div>
        </div>
      </section>

      {/* Forms Section */}
      <section
        id="contact-form"
        className="px-6 py-20 max-w-7xl mx-auto scroll-mt-32"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-[#25304f] p-10 rounded-2xl shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold mb-6 text-center">
              Send Us a Message
            </h2>
            <form className="flex flex-col space-y-6">
              <input
                type="text"
                placeholder="Full Name"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
                required
              />
              <textarea
                placeholder="Your Message"
                rows={5}
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
                required
              ></textarea>
              <button
                type="submit"
                className="bg-white text-[#1f2a36] font-semibold py-4 rounded-xl hover:shadow-lg transition"
              >
                Submit
              </button>
            </form>
          </div>

          {/* Custom Jewelry Inquiry Form */}
          <div className="bg-[#25304f] p-10 rounded-2xl shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold mb-6 text-center">
              Start Your Custom Jewelry Creation
            </h2>
            <form className="flex flex-col space-y-6">
              <input
                type="text"
                placeholder="Full Name"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
                required
              />
              <input
                type="text"
                placeholder="Phone Number (optional)"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Type of Jewelry (e.g., Engagement Ring, Necklace)"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <textarea
                placeholder="Describe your vision or ideas..."
                rows={5}
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
                required
              ></textarea>
              <button
                type="submit"
                className="bg-white text-[#1f2a36] font-semibold py-4 rounded-xl hover:shadow-lg transition"
              >
                Submit Custom Request
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
