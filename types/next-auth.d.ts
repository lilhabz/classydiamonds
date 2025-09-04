// 📄 types/next-auth.d.ts – Extended Session, User, and JWT Fields with Name Parts + Favorites

import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

// Extend NextAuth Session to include additional user properties
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      isAdmin: boolean;

      // 📦 Extended fields
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;

      // 🆕 Favorites
      favorites?: string[];
    };
  }

  // Extend the User object returned by Credentials/GitHub/etc.
  interface User extends DefaultUser {
    id: string;
    isAdmin: boolean;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;

    // 🆕 Favorites
    favorites?: string[];
  }
}

// Extend NextAuth JWT to include additional user properties
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    name?: string;
    email?: string;
    isAdmin?: boolean;

    // 📦 Match user fields
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;

    // 🆕 Favorites
    favorites?: string[];
  }
}
