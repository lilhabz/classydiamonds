// 📄 pages/account/edit.tsx – Edit Profile Page ✏️

import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import { useState } from "react";
import clientPromise from "@/lib/mongodb";
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
  const [name, setName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    setStatus("");

    const res = await fetch("/api/account/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus("✅ Profile updated successfully.");
      router.replace(router.asPath);
    } else {
      setStatus(`❌ ${data.error}`);
    }

    setLoading(false);
  };

  return (
    <div className="bg-[#1f2a36] text-white min-h-screen px-4 py-10">
      <div className="max-w-md mx-auto bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile ✏️</h1>

        <label className="block text-sm mb-1">Name</label>
        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          className="w-full mb-4 px-4 py-2 rounded bg-[#2a374f] text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

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
