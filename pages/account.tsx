// 📄 pages/account.tsx

import { GetServerSideProps } from "next";
import { getSession, signOut } from "next-auth/react";
import { Session } from "next-auth";

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
    props: { session },
  };
};

export default function AccountPage({ session }: { session: any }) {
  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "Not available";

  return (
    <div className="bg-[#1f2a36] text-white min-h-screen flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome 👋</h2>
        <p className="text-lg font-semibold mb-2">{name}</p>
        <p className="text-sm text-gray-300 mb-6">{email}</p>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
