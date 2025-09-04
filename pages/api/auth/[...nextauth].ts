// 📄 pages/api/auth/[...nextauth].ts – Handles login, Google/Credentials providers, email confirmation enforcement, full session fields, admin access, and favorites 🛠️

import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { adapter } from "@/lib/mongoAdapter";
import clientPromise from "@/lib/mongodb";
import { compare } from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { Session, User } from "next-auth";

// 🔧 Define NextAuth options with strict typing
export const authOptions: AuthOptions = {
  adapter,
  providers: [
    // 🌐 Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // 🔑 Email & Password Credentials Provider
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

        // 🚫 Missing or invalid user
        if (!user || !user.password) return null;
        // 📧 Enforce email confirmation
        if (!user.emailConfirmed) {
          throw new Error("Please confirm your email before logging in.");
        }
        // 🔒 Verify password
        const isValid = await compare(credentials!.password, user.password);
        if (!isValid) return null;

        // ✂️ Combine firstName + lastName into fullName
        const fullName = `${user.firstName || ""} ${
          user.lastName || ""
        }`.trim();

        // 📦 Return user object for JWT
        return {
          id: user._id.toString(),
          name: fullName,
          email: user.email,
          isAdmin: user.isAdmin || false,

          // 🧩 Raw splits for session
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          phone: user.phone || "",
          address: user.address || "",
          city: user.city || "",
          state: user.state || "",
          zip: user.zip || "",
          country: user.country || "",

          // 🆕 Favorites from DB
          favorites: Array.isArray(user.favorites) ? user.favorites : [],
        } as User & { favorites?: string[] };
      },
    }),
  ],

  // 🔑 Security
  secret: process.env.NEXTAUTH_SECRET,

  // 📨 Use JWT sessions
  session: {
    strategy: "jwt" as const,
    // Limit session lifetime to 15 minutes for improved security
    maxAge: 15 * 60,
  },

  // 🔄 Callbacks to modify token & session
  callbacks: {
    // 🔐 Populate JWT token with custom fields
    async jwt({
      token,
      user,
      account,
      profile,
      trigger,
    }: {
      token: JWT;
      user?: User & {
        firstName?: string;
        lastName?: string;
        favorites?: string[];
      };
      account?: any;
      profile?: any;
      trigger?: "signIn" | "signUp" | "update";
    }) {
      // On first sign-in (Google or Credentials) we have a `user` object → hydrate token fully
      if (user) {
        token.id = user.id;
        token.name = user.name ?? "";
        token.email = user.email ?? "";
        token.isAdmin = (user as any).isAdmin || false;

        token.firstName = (user as any).firstName || "";
        token.lastName = (user as any).lastName || "";

        token.phone = (user as any).phone || "";
        token.address = (user as any).address || "";
        token.city = (user as any).city || "";
        token.state = (user as any).state || "";
        token.zip = (user as any).zip || "";
        token.country = (user as any).country || "";

        // 🆕 Favorites (from DB at login)
        token.favorites = Array.isArray(user.favorites) ? user.favorites : [];
        return token;
      }

      // If we already have favorites on token, keep them
      if (Array.isArray((token as any).favorites)) {
        return token;
      }

      // 🛟 Fallback: if token lacks favorites but we know the email, fetch once
      if (token?.email) {
        try {
          const client = await clientPromise;
          const db = client.db("classydiamonds");
          const doc = await db
            .collection("users")
            .findOne({ email: token.email }, { projection: { favorites: 1 } });
          (token as any).favorites = Array.isArray(doc?.favorites)
            ? doc!.favorites
            : [];
        } catch {
          // ignore DB errors; token continues without favorites
          (token as any).favorites = [];
        }
      }

      return token;
    },

    // 📨 Expose all fields on session.user
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT & {
        firstName?: string;
        lastName?: string;
        favorites?: string[];
      };
    }) {
      if (session.user) {
        session.user.id = token.id!;
        // Fallback to empty string if null/undefined
        session.user.name = token.name ?? "";
        session.user.email = token.email ?? "";
        (session.user as any).isAdmin = token.isAdmin || false;

        (session.user as any).firstName = token.firstName || "";
        (session.user as any).lastName = token.lastName || "";

        (session.user as any).phone = (token as any).phone || "";
        (session.user as any).address = (token as any).address || "";
        (session.user as any).city = (token as any).city || "";
        (session.user as any).state = (token as any).state || "";
        (session.user as any).zip = (token as any).zip || "";
        (session.user as any).country = (token as any).country || "";

        // 🆕 Favorites on session
        (session.user as any).favorites = Array.isArray(token.favorites)
          ? token.favorites
          : [];
      }
      return session;
    },
  },
};

// 🛠️ Export NextAuth with configured options
export default NextAuth(authOptions);
