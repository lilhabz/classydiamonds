// 📂 pages/api/auth/[...nextauth].ts

import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { adapter } from "@/lib/mongoAdapter";

export const authOptions: NextAuthOptions = {
  adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 🧠 This is a placeholder — you’ll want to build real validation here
        if (
          credentials?.email === "demo@classydiamonds.com" &&
          credentials?.password === "demo123"
        ) {
          return {
            id: "1",
            name: "Demo User",
            email: "demo@classydiamonds.com",
          };
        }
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
  },
};

export default NextAuth(authOptions);
