// 📄 pages/api/auth/[...nextauth].ts - Handles login & session logic

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { adapter } from "@/lib/mongoAdapter";
import clientPromise from "@/lib/mongodb";
import { compare } from "bcryptjs";

export const authOptions = {
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
        const client = await clientPromise;
        const db = client.db("classydiamonds");
        const user = await db
          .collection("users")
          .findOne({ email: credentials?.email });

        if (!user || !user.password) return null;

        const isValid = await compare(credentials!.password, user.password);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const, // ✅ Type-safe for TypeScript
  },
};

export default NextAuth(authOptions);
