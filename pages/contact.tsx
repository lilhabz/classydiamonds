// 📄 pages/contact.tsx - Full Page (Hero, About, Map, Forms w/ Uploads)

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { useState } from "react";

export default function ContactPage() {
  const [messageStatus, setMessageStatus] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [messagePreview, setMessagePreview] = useState<string | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    type: "message" | "custom"
  ) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("formCategory", type);

    if (type === "message" && messageFile) {
      formData.append("file", messageFile);
    } else if (type === "custom" && customFile) {
      formData.append("file", customFile);
    }

    const response = await fetch("/api/contact", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (response.ok) {
      form.reset();
      if (type === "message") {
        setMessageStatus("Thank you! Your message has been sent.");
        setMessageFile(null);
        setMessagePreview(null);
      } else {
        setCustomStatus("Awesome! Your custom request has been submitted.");
        setCustomFile(null);
        setCustomPreview(null);
      }
    } else {
      const err = result.error || "Submission failed. Please try again.";
      if (type === "message") setMessageStatus(err);
      else setCustomStatus(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
      <Navbar />

      {/* 🌟 Hero Section */}
      <section className="w-full pt-[120px] pb-16 text-center px-4 -mt-20">
        <h1 className="text-3xl sm:text-4xl font-serif font-semibold mb-6">
          Contact Classy Diamonds
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto text-base sm:text-lg">
          Turning dreams into reality for nearly 30 years.
        </p>
      </section>

      {/* 🧑‍🏭 About Section */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* 📸 Ned's Photo */}
          <div className="w-full h-80 sm:h-96 overflow-hidden rounded-2xl shadow-lg">
            <img
              src="/ned-photo.jpg"
              alt="Ned - Classy Diamonds"
              className="w-full h-full object-cover"
            />
          </div>

          {/* 📝 About Text */}
          <div className="text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8">
              About Us
            </h2>
            <p className="text-base sm:text-lg text-[#cfd2d6] leading-relaxed">
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

      {/* 📍 Contact Info + Map */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* 📞 Contact Info */}
          <div className="flex flex-col gap-8 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start">
              <FaPhoneAlt className="text-3xl mb-2" />
              <p className="text-base sm:text-lg">+1 (123) 456-7890</p>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <FaEnvelope className="text-3xl mb-2" />
              <p className="text-base sm:text-lg">info@classydiamonds.com</p>
            </div>
          </div>

          {/* 🗺️ Map Placeholder */}
          <div className="w-full h-60 sm:h-64 bg-[#25304f] rounded-2xl overflow-hidden flex items-center justify-center">
            <p className="text-[#cfd2d6] text-center">Google Map Coming Soon</p>
          </div>
        </div>
      </section>

      {/* 📝 Forms Section */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* 💍 Custom Jewelry Form */}
          <div className="bg-[#25304f] p-8 sm:p-10 rounded-2xl shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold mb-6 text-center">
              Start Your Custom Jewelry Creation
            </h2>
            <form
              className="flex flex-col space-y-6"
              onSubmit={(e) => handleSubmit(e, "custom")}
            >
              <input
                name="name"
                placeholder="Full Name"
                required
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <input
                name="email"
                type="email"
                placeholder="Email Address"
                required
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <input
                name="phone"
                placeholder="Phone Number (optional)"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <input
                name="type"
                placeholder="Type of Jewelry"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <textarea
                name="customMessage"
                placeholder="Describe your vision or ideas..."
                rows={5}
                required
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              ></textarea>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setCustomFile(file || null);
                    if (file) setCustomPreview(URL.createObjectURL(file));
                  }}
                  className="text-white"
                />
                {customPreview && (
                  <img
                    src={customPreview}
                    alt="Preview"
                    className="mt-2 w-24 h-24 object-cover rounded-xl"
                  />
                )}
              </div>
              <button
                type="submit"
                className="bg-white text-[#1f2a36] font-semibold py-4 rounded-xl hover:shadow-lg hover:scale-105 transition"
              >
                Submit Custom Request
              </button>
              {customStatus && (
                <p className="text-sm text-green-400 mt-2">{customStatus}</p>
              )}
            </form>
          </div>

          {/* 📬 General Message Form */}
          <div className="bg-[#25304f] p-8 sm:p-10 rounded-2xl shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold mb-6 text-center">
              Send Us a Message
            </h2>
            <form
              className="flex flex-col space-y-6"
              onSubmit={(e) => handleSubmit(e, "message")}
            >
              <input
                name="name"
                placeholder="Full Name"
                required
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <input
                name="email"
                type="email"
                placeholder="Email Address"
                required
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <input
                name="phone"
                placeholder="Phone Number"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <input
                name="preference"
                placeholder="Preferred Contact Method"
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              />
              <textarea
                name="message"
                placeholder="Your Message"
                rows={5}
                required
                className="p-4 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              ></textarea>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setMessageFile(file || null);
                    if (file) setMessagePreview(URL.createObjectURL(file));
                  }}
                  className="text-white"
                />
                {messagePreview && (
                  <img
                    src={messagePreview}
                    alt="Preview"
                    className="mt-2 w-24 h-24 object-cover rounded-xl"
                  />
                )}
              </div>
              <button
                type="submit"
                className="bg-white text-[#1f2a36] font-semibold py-4 rounded-xl hover:shadow-lg hover:scale-105 transition"
              >
                Submit
              </button>
              {messageStatus && (
                <p className="text-sm text-green-400 mt-2">{messageStatus}</p>
              )}
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
