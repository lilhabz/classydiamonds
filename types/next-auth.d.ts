// 📄 types/next-auth.d.ts – Extended Session Fields

import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      isAdmin: boolean;

      // 📦 Extended fields
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    isAdmin: boolean;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    name?: string;
    email?: string;
    isAdmin?: boolean;

    // 📦 Match user fields
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }
}
