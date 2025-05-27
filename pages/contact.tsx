// 📄 pages/contact.tsx – Updated: Auto Expand by URL Param + Desktop Scroll Fix + Form Width 💎

import Head from "next/head";
import Image from "next/image";
import { FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

export default function ContactPage() {
  const router = useRouter();
  const [messageStatus, setMessageStatus] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [messagePreview, setMessagePreview] = useState<string | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  const customRef = useRef<HTMLDivElement | null>(null);
  const messageRef = useRef<HTMLDivElement | null>(null);

  // 🌐 Expand form + scroll to anchor based on query param
  useEffect(() => {
    if (router.query.open === "custom") {
      setShowCustom(true);
      setTimeout(() => {
        customRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
    if (router.query.open === "message") {
      setShowMessage(true);
      setTimeout(() => {
        messageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, [router.query]);

  useEffect(() => {
    const timeout = setTimeout(() => setShowMap(true), 1500);
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    type: "message" | "custom"
  ) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("formCategory", type);

    const phoneRegex = /^[0-9\-\+\s\(\)]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const message = formData.get("message") as string;
    const customMessage = formData.get("customMessage") as string;
    const preference = formData.get("preference") as string;
    const typeSelection = formData.get("type") as string;

    if (!name.trim().includes(" ")) {
      alert("Please enter your full first and last name.");
      setIsSubmitting(false);
      return;
    }
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }
    if (!phoneRegex.test(phone)) {
      alert("Please enter a valid phone number.");
      setIsSubmitting(false);
      return;
    }
    if (!preference.trim()) {
      alert("Please provide a preferred contact method.");
      setIsSubmitting(false);
      return;
    }
    if (type === "message" && !message.trim()) {
      alert("Please enter your message.");
      setIsSubmitting(false);
      return;
    }
    if (type === "custom") {
      if (!customMessage.trim()) {
        alert("Please describe your custom vision.");
        setIsSubmitting(false);
        return;
      }
      if (!typeSelection || typeSelection.trim() === "") {
        alert("Please select the jewelry type.");
        setIsSubmitting(false);
        return;
      }
    }

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
    setIsSubmitting(false);
  };

  return (
    <>
      {/* 🧠 SEO Head Tags */}
      <Head>
        <title>Contact Classy Diamonds | Woodbridge Jewelry Exchange</title>
        <meta
          name="description"
          content="Contact Classy Diamonds for custom engagement rings, wedding bands, and more. Located in the Woodbridge Jewelry Exchange with 30+ years of excellence."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Contact Classy Diamonds" />
        <meta
          property="og:description"
          content="Contact Classy Diamonds for expert custom jewelry guidance in Woodbridge, NJ."
        />
        <meta
          property="og:image"
          content="https://classydiamonds.vercel.app/hero-contact.jpg"
        />
        <meta
          property="og:url"
          content="https://classydiamonds.vercel.app/contact"
        />
      </Head>

      <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
        {/* 🌟 Hero Section - Optimized for LCP */}
        <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="/hero-contact.jpg"
              alt="Hands wearing diamond rings"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black opacity-50 pointer-events-none" />
          </div>
          <div className="relative z-10 px-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-semibold mb-6 text-[var(--foreground)]">
              Contact Classy Diamonds
            </h1>
            <p className="text-[var(--foreground)] max-w-2xl mx-auto text-base sm:text-lg">
              Turning dreams into reality for nearly 30 years.
            </p>
          </div>
        </section>

        {/* 🧑‍🏭 About Section */}
        <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="w-full h-80 sm:h-96 overflow-hidden rounded-2xl shadow-lg relative">
              <Image
                src="/ned.jpg"
                alt="Ned standing behind the Classy Diamonds display counter"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
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

        {/* 📍 Contact Info + Lazy Loaded Map */}
        <section className="px-4 sm:px-6 lg:px-12 xl:px-20 py-16 sm:py-20 max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
            <div className="bg-[var(--bg-nav)] rounded-2xl shadow-lg p-8 sm:p-10 flex flex-col gap-8 text-center md:text-left hover:shadow-2xl transition-shadow duration-300">
              <div className="flex flex-col items-center md:items-start">
                <FaPhoneAlt className="text-3xl mb-2 text-[var(--foreground)]" />
                <p className="text-base sm:text-lg text-[#cfd2d6]">
                  +1 (123) 456-7890
                </p>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <FaEnvelope className="text-3xl mb-2 text-[var(--foreground)]" />
                <p className="text-base sm:text-lg text-[#cfd2d6]">
                  info@classydiamonds.com
                </p>
              </div>
            </div>

            <div className="w-full h-60 sm:h-64 rounded-2xl overflow-hidden shadow-lg">
              {showMap && (
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d6062.453504254061!2d-74.2965584!3d40.558669599999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c3b5c5e191bbb5%3A0x6ec9ad5e4e09ad39!2sWoodbridge%20Jewelry%20Exchange!5e0!3m2!1sen!2sus!4v1746210843513!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Map showing location of Classy Diamonds at Woodbridge Jewelry Exchange"
                ></iframe>
              )}
            </div>
          </div>
        </section>

        {/* 📝 Forms Section (Mobile = Flush Edge-to-Edge, No Gaps) */}
        <section className="pt-16 sm:pt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-screen-xl mx-auto">
            {/* 💍 Custom Jewelry Form */}
            <div
              ref={customRef}
              className="relative px-4 sm:px-6 xl:px-10 max-w-3xl mx-auto w-full"
            >
              {/* 🔧 Anchor Offset */}
              <div
                id="custom-form"
                className="absolute -top-32"
                aria-hidden="true"
              />

              {/* 🔽 Toggle Button (Both Mobile & Desktop for Consistency) */}
              <div className="w-full">
                <button
                  onClick={() => setShowCustom((prev) => !prev)}
                  className="w-full text-left bg-[var(--bg-nav)] text-[var(--foreground)] font-semibold px-6 py-4 border-b border-[var(--bg-nav)]"
                >
                  💍 Start Your Custom Jewelry Creation
                  <span className="float-right pr-2">
                    {showCustom ? "▲" : "▼"}
                  </span>
                </button>
              </div>

              {/* 📩 Form Body */}
              <div className={`w-full ${showCustom ? "block" : "hidden"}`}>
                <div className="bg-[var(--bg-nav)] p-6 sm:p-10 border-b border-[var(--bg-nav)] rounded-b-xl">
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
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <input
                      name="email"
                      type="email"
                      placeholder="Email Address"
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <input
                      name="phone"
                      placeholder="Phone Number"
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <select
                      name="preference"
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    >
                      <option value="" disabled hidden selected>
                        Preferred Contact Method
                      </option>
                      <option>Call</option>
                      <option>Text</option>
                      <option>Email</option>
                    </select>
                    <select
                      name="type"
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    >
                      <option value="" disabled hidden selected>
                        Select Jewelry Type
                      </option>
                      <option>Engagement Ring</option>
                      <option>Wedding Band</option>
                      <option>Earrings</option>
                      <option>Necklace</option>
                      <option>Bracelet</option>
                      <option>Pendant</option>
                    </select>
                    <textarea
                      name="customMessage"
                      placeholder="Describe your vision or ideas..."
                      rows={5}
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <div className="flex flex-col items-start space-y-2">
                      <label
                        htmlFor="customFileInput"
                        className="bg-white text-[#1f2a44] font-semibold py-2 px-6 rounded-lg cursor-pointer hover:shadow-lg hover:scale-105 transition"
                      >
                        Upload Image
                      </label>
                      <input
                        id="customFileInput"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setCustomFile(file || null);
                          if (file) setCustomPreview(URL.createObjectURL(file));
                        }}
                        className="hidden"
                      />
                    </div>
                    {customPreview && (
                      <img
                        src={customPreview}
                        alt="Preview"
                        loading="lazy"
                        className="mt-2 w-24 h-24 object-cover rounded-xl"
                      />
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-white text-[#1f2a44] font-semibold py-4 rounded-xl hover:shadow-lg hover:scale-105 transition"
                    >
                      Submit Custom Request
                    </button>
                    {customStatus && (
                      <p className="text-sm text-green-400 mt-2">
                        {customStatus}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* 📨 General Message Form */}
            <div
              ref={messageRef}
              className="relative px-4 sm:px-6 xl:px-10 max-w-3xl mx-auto w-full"
            >
              {/* 🔧 Anchor Offset */}
              <div
                id="message-form"
                className="absolute -top-32"
                aria-hidden="true"
              />

              {/* 🔽 Toggle Button (Both Mobile & Desktop) */}
              <div className="w-full">
                <button
                  onClick={() => setShowMessage((prev) => !prev)}
                  className="w-full text-left bg-[var(--bg-nav)] text-[var(--foreground)] font-semibold px-6 py-4 border-b border-[var(--bg-nav)]"
                >
                  📨 Send Us a Message
                  <span className="float-right pr-2">
                    {showMessage ? "▲" : "▼"}
                  </span>
                </button>
              </div>

              {/* 📩 Form Body */}
              <div className={`w-full ${showMessage ? "block" : "hidden"}`}>
                <div className="bg-[var(--bg-nav)] p-6 sm:p-10 border-b border-[var(--bg-nav)] rounded-b-xl">
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
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <input
                      name="email"
                      type="email"
                      placeholder="Email Address"
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <input
                      name="phone"
                      placeholder="Phone Number"
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <select
                      name="preference"
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    >
                      <option value="" disabled hidden selected>
                        Preferred Contact Method
                      </option>
                      <option>Call</option>
                      <option>Text</option>
                      <option>Email</option>
                    </select>
                    <input
                      name="sku"
                      placeholder="SKU # (optional)"
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <textarea
                      name="message"
                      placeholder="Your Message"
                      rows={5}
                      required
                      className="border border-[var(--foreground)] rounded-xl px-4 py-2"
                    />
                    <div className="flex flex-col items-start space-y-2">
                      <label
                        htmlFor="messageFile"
                        className="bg-white text-[#1f2a44] font-semibold py-2 px-6 rounded-lg cursor-pointer hover:shadow-lg hover:scale-105 transition"
                      >
                        Upload Image
                      </label>
                      <input
                        id="messageFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setMessageFile(file || null);
                          if (file)
                            setMessagePreview(URL.createObjectURL(file));
                        }}
                        className="hidden"
                      />
                    </div>
                    {messagePreview && (
                      <img
                        src={messagePreview}
                        alt="Preview"
                        loading="lazy"
                        className="mt-2 w-24 h-24 object-cover rounded-xl"
                      />
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-white text-[#1f2a44] font-semibold py-4 rounded-xl hover:shadow-lg hover:scale-105 transition"
                    >
                      Submit Message
                    </button>
                    {messageStatus && (
                      <p className="text-sm text-green-400 mt-2">
                        {messageStatus}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Spacer between forms and footer */}
        <div className="h-16"></div>
      </div>
    </>
  );
}
