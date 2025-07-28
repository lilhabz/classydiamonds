// 📄 pages/account/edit.tsx – Edit Profile Page (Address Sync for Checkout Prefill) ✏️

import { useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Breadcrumbs from "@/components/Breadcrumbs";

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
  return { props: {} };
};

export default function EditProfile() {
  const router = useRouter();
  const { data: session } = useSession();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Prefill form when session loads
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
      setPhone((session.user as any)?.phone ?? "");
      const addr = (session.user as any)?.address || {};
      setStreet(addr.street1 ?? "");
      setStreet2(addr.street2 ?? "");
      setCity(addr.city ?? "");
      setStateVal(addr.state ?? "");
      setZip(addr.zip ?? "");
      setCountry(addr.country ?? "");
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
        address: {
          street1: street,
          street2,
          city,
          state: stateVal,
          zip,
          country,
        },
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
    <div className="bg-[var(--bg-page)] text-[var(--foreground)] min-h-screen px-4 py-10">
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mb-6 -mt-2">
        <Breadcrumbs
          customLabels={{ account: "Account", edit: "Edit Profile" }}
        />
      </div>

      <div className="max-w-md mx-auto bg-[var(--foreground)]/10 backdrop-blur p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile ✏️</h1>

        {/* Name */}
        <label className="block text-sm mb-1">Name</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Email */}
        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          className="w-full mb-4 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Phone */}
        <label className="block text-sm mb-1">Phone</label>
        <input
          type="tel"
          className="w-full mb-4 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* Address */}
        <label className="block text-sm mb-1">Street Address</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
        />

        <label className="block text-sm mb-1">Street Address 2</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={street2}
          onChange={(e) => setStreet2(e.target.value)}
        />

        <label className="block text-sm mb-1">City</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <label className="block text-sm mb-1">State</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={stateVal}
          onChange={(e) => setStateVal(e.target.value)}
        />

        <label className="block text-sm mb-1">ZIP Code</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
        />

        <label className="block text-sm mb-1">Country</label>
        <input
          type="text"
          className="w-full mb-6 px-4 py-2 rounded bg-[var(--bg-nav)]"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full bg-[var(--foreground)] hover:bg-white py-2 rounded text-[var(--bg-nav)] font-semibold"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

        {status && (
          <div
            className={`mt-4 text-center rounded-lg px-4 py-3 text-sm ${
              status.startsWith("✅") ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
