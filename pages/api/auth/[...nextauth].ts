// 📄 pages/api/auth/[...nextauth].ts – Handles login, Google/Credentials providers, and adds admin to session 🛠️

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { adapter } from "@/lib/mongoAdapter";
import clientPromise from "@/lib/mongodb";
import { compare } from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { Session, User } from "next-auth";

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
          isAdmin: user.isAdmin || false, // 🛡️ Include isAdmin from DB
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    // ✅ Add admin flag to JWT token
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.isAdmin = (user as any).isAdmin ?? false;
      }
      return token;
    },

    // ✅ Add admin flag to session for client-side access
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as any).isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
