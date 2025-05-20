// 📄 pages/account/edit.tsx – Edit Profile Page ✏️ (Expanded with Full Account Info)

import { useSession, signOut } from "next-auth/react";

import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/router";

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
    props: {
      session,
    },
  };
};

export default function EditProfile({ session }: any) {
  const router = useRouter();

  // ✏️ Fields from session or blank fallback
  const [name, setName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [phone, setPhone] = useState(session?.user?.phone ?? "");
  const [address, setAddress] = useState(session?.user?.address ?? "");
  const [city, setCity] = useState(session?.user?.city ?? "");
  const [state, setState] = useState(session?.user?.state ?? "");
  const [zip, setZip] = useState(session?.user?.zip ?? "");
  const [country, setCountry] = useState(session?.user?.country ?? "");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

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

        {status && <p className="mt-4 text-center text-sm">{status}</p>}
      </div>
    </div>
  );
}
