// 📄 pages/api/auth/[...nextauth].ts – Handles login, Google/Credentials providers, email confirmation enforcement, full session fields, admin access, and favorites 🛠️

import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { adapter } from "@/lib/mongoAdapter";
import clientPromise from "@/lib/mongodb";
import { compare } from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { Session, User } from "next-auth";

const CONFIRM_EMAIL_ERROR =
  "Please confirm your email before logging in. Open the confirmation email we sent when you registered, click the link to activate your account, then return to sign in. If you can’t find the email, check your spam folder or request another confirmation.";

// 🚀 Force Node runtime (NextAuth + bcrypt + MongoDB require Node on Vercel)
export const runtime = "nodejs";

// 🔧 Define NextAuth options with strict typing
export const authOptions: AuthOptions = {
  adapter,
  providers: [
    // 🌐 Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
        const user = await db.collection("users").findOne({ email: credentials?.email });

        // 🚫 Missing or invalid user
        if (!user || !user.password) return null;
        // 📧 Enforce email confirmation
        if (!user.emailConfirmed) {
          throw new Error(CONFIRM_EMAIL_ERROR);
        }
        // 🔒 Verify password
        const isValid = await compare(credentials!.password, user.password);
        if (!isValid) return null;

        // ✂️ Combine firstName + lastName into fullName
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

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
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes
  },

  // 🔄 Callbacks to modify token & session
  callbacks: {
    // 🚫 Block sign-in for any account whose email hasn't been confirmed yet
    async signIn({ user, account }) {
      if (!user?.email) return false;

      if (account?.provider === "google") {
        try {
          const client = await clientPromise;
          const db = client.db("classydiamonds");
          const existingUser = await db.collection("users").findOne({ email: user.email });

          if (existingUser) {
            const existingUserId = existingUser._id.toString();

            if (account?.providerAccountId) {
              const adapterInstance = adapter as any;
              if (
                adapterInstance?.getUserByAccount &&
                adapterInstance?.linkAccount &&
                typeof adapterInstance.getUserByAccount === "function" &&
                typeof adapterInstance.linkAccount === "function"
              ) {
                const linkedUser = await adapterInstance.getUserByAccount({
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                });

                if (!linkedUser) {
                  await adapterInstance.linkAccount({
                    ...account,
                    userId: existingUserId,
                  });
                }
              }
            }

            const fullName = `${existingUser.firstName || ""} ${existingUser.lastName || ""}`.trim();

            Object.assign(user as any, {
              id: existingUserId,
              email: existingUser.email,
              name: fullName || user.name,
              isAdmin: existingUser.isAdmin || false,
              firstName: existingUser.firstName || "",
              lastName: existingUser.lastName || "",
              phone: existingUser.phone || "",
              address: existingUser.address || "",
              city: existingUser.city || "",
              state: existingUser.state || "",
              zip: existingUser.zip || "",
              country: existingUser.country || "",
              favorites: Array.isArray(existingUser.favorites) ? existingUser.favorites : [],
              emailConfirmed: existingUser.emailConfirmed ?? true,
            });
          }
        } catch (error) {
          console.error("Failed to link Google account to existing credentials user", error);
          return false;
        }

        return true;
      }

      if (account?.provider !== "credentials") {
        return true;
      }

      // If the calling code already flagged them as unconfirmed, reuse that
      if ((user as any).emailConfirmed === false) {
        throw new Error(CONFIRM_EMAIL_ERROR);
      }

      const client = await clientPromise;
      const db = client.db("classydiamonds");
      const existingUser = await db
        .collection("users")
        .findOne({ email: user.email }, { projection: { emailConfirmed: 1 } });

      if (!existingUser?.emailConfirmed) {
        throw new Error(CONFIRM_EMAIL_ERROR);
      }

      return true;
    },

    // 🔐 Populate JWT token with custom fields
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: User & {
        firstName?: string;
        lastName?: string;
        favorites?: string[];
      };
    }) {
      // On first sign-in (Google or Credentials) we have a `user` object → hydrate token fully
      if (user) {
        token.id = (user as any).id;
        token.name = user.name ?? "";
        token.email = user.email ?? "";
        (token as any).isAdmin = (user as any).isAdmin || false;

        (token as any).firstName = (user as any).firstName || "";
        (token as any).lastName = (user as any).lastName || "";

        (token as any).phone = (user as any).phone || "";
        (token as any).address = (user as any).address || "";
        (token as any).city = (user as any).city || "";
        (token as any).state = (user as any).state || "";
        (token as any).zip = (user as any).zip || "";
        (token as any).country = (user as any).country || "";

        // 🆕 Favorites (from DB at login)
        (token as any).favorites = Array.isArray((user as any).favorites) ? (user as any).favorites : [];
        return token;
      }

      // If we already have favorites on token, keep them
      if (Array.isArray((token as any).favorites)) return token;

      // 🛟 Fallback: if token lacks favorites but we know the email, fetch once
      if (token?.email) {
        try {
          const client = await clientPromise;
          const db = client.db("classydiamonds");
          const doc = await db
            .collection("users")
            .findOne({ email: token.email }, { projection: { favorites: 1 } });
          (token as any).favorites = Array.isArray(doc?.favorites) ? doc!.favorites : [];
        } catch {
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
        (session.user as any).id = (token as any).id;
        session.user.name = token.name ?? "";
        session.user.email = token.email ?? "";
        (session.user as any).isAdmin = (token as any).isAdmin || false;

        (session.user as any).firstName = (token as any).firstName || "";
        (session.user as any).lastName = (token as any).lastName || "";

        (session.user as any).phone = (token as any).phone || "";
        (session.user as any).address = (token as any).address || "";
        (session.user as any).city = (token as any).city || "";
        (session.user as any).state = (token as any).state || "";
        (session.user as any).zip = (token as any).zip || "";
        (session.user as any).country = (token as any).country || "";

        // 🆕 Favorites on session
        (session.user as any).favorites = Array.isArray((token as any).favorites)
          ? (token as any).favorites
          : [];
      }
      return session;
    },
  },
};

// 🛠️ Export NextAuth with configured options
export default NextAuth(authOptions);
