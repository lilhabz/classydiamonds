// 📄 pages/account/edit.tsx – Edit Profile Page ✏️ (Breadcrumb Aligned Left Under Navbar)

import { useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Breadcrumbs from "@/components/Breadcrumbs";

// ✅ Server-side auth guard
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default function EditProfile() {
  const router = useRouter();
  const { data: session } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
      setPhone(session.user.phone ?? "");
      setAddress(session.user.address ?? "");
      setCity(session.user.city ?? "");
      setState(session.user.state ?? "");
      setZip(session.user.zip ?? "");
      setCountry(session.user.country ?? "");
    }
  }, [session]);

  const handleUpdate = async () => {
    setLoading(true);
    setStatus("");

    const res = await fetch("/api/account/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        country,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus("✅ Profile updated successfully.");
      router.reload();
    } else {
      setStatus(`❌ ${data.error}`);
    }

    setLoading(false);
  };

  return (
    <div className="bg-[#1f2a36] text-white min-h-screen px-4 py-10">
      {/* 🧭 Breadcrumb container – full bleed + tight to navbar */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-2 mb-4">
        <Breadcrumbs
          customLabels={{ account: "Account", edit: "Edit Profile" }}
        />
      </div>

      {/* 📄 Edit Profile Form Card – centered card below breadcrumbs */}
      <div className="max-w-md mx-auto bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile ✏️</h1>

        {/* 🧍 Name */}
        <label className="block text-sm mb-1">Name</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* 📧 Email */}
        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* 📞 Phone */}
        <label className="block text-sm mb-1">Phone</label>
        <input
          type="tel"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* 🏠 Address */}
        <label className="block text-sm mb-1">Street Address</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* 🏙️ City */}
        <label className="block text-sm mb-1">City</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        {/* 🧭 State */}
        <label className="block text-sm mb-1">State</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />

        {/* 🧾 ZIP */}
        <label className="block text-sm mb-1">ZIP Code</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
        />

        {/* 🌍 Country */}
        <label className="block text-sm mb-1">Country</label>
        <input
          type="text"
          className="w-full mb-6 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />

        {/* 💾 Save Button */}
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 py-2 rounded text-white font-semibold"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        {/* ✅ Styled confirmation or error message */}
        {status && (
          <div
            className={`mt-4 text-center rounded-lg px-4 py-3 text-sm ${
              status.startsWith("✅")
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
