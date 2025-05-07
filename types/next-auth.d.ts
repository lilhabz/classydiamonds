// types/next-auth.d.ts

import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean; // ✅ This tells TypeScript it's safe to use
    };
  }

  interface User {
    isAdmin: boolean;
  }
}
