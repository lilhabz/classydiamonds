// 📄 pages/api/auth/[...nextauth].ts – Handles login, Google/Credentials providers, full session fields, and admin access 🛠️

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

        // 🆕 Combine firstName/lastName into full name
        const fullName = `${user.firstName || ""} ${
          user.lastName || ""
        }`.trim();

        return {
          id: user._id.toString(),
          name: fullName,
          email: user.email,
          isAdmin: user.isAdmin || false,

          // 🆕 Raw name parts for session
          firstName: user.firstName || "",
          lastName: user.lastName || "",

          phone: user.phone || "",
          address: user.address || "",
          city: user.city || "",
          state: user.state || "",
          zip: user.zip || "",
          country: user.country || "",
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    // ✅ Add all user info to JWT
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: User & { firstName?: string; lastName?: string };
    }) {
      if (user) {
        token.id = user.id;
        token.name = user.name ?? undefined;
        token.email = user.email ?? undefined;
        token.isAdmin = (user as any).isAdmin ?? false;

        // 🆕 Include split name parts
        token.firstName = (user as any).firstName ?? "";
        token.lastName = (user as any).lastName ?? "";

        // Extended fields
        token.phone = (user as any).phone ?? "";
        token.address = (user as any).address ?? "";
        token.city = (user as any).city ?? "";
        token.state = (user as any).state ?? "";
        token.zip = (user as any).zip ?? "";
        token.country = (user as any).country ?? "";
      }
      return token;
    },

    // ✅ Add all fields to session.user
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT & { firstName?: string; lastName?: string };
    }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        (session.user as any).isAdmin = token.isAdmin ?? false;

        // 🆕 Make name parts available
        (session.user as any).firstName = token.firstName ?? "";
        (session.user as any).lastName = token.lastName ?? "";

        // Extended fields
        (session.user as any).phone = token.phone ?? "";
        (session.user as any).address = token.address ?? "";
        (session.user as any).city = token.city ?? "";
        (session.user as any).state = token.state ?? "";
        (session.user as any).zip = token.zip ?? "";
        (session.user as any).country = token.country ?? "";
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
