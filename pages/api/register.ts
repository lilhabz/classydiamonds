// pages/api/register.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

type Ok =
  | {
      ok: true;
      userId: string;
      alreadyExists?: boolean;
      upgradedFromSocial?: boolean;
    }
  | { ok: false; error: string };

function isValidEmail(email = ""): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeStr(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      name,
      email,
      password,
      phone,
      address, // optional: { line1, line2, city, state, postal_code, country }
    } = (req.body ?? {}) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    };

    const cleanName = safeStr(name);
    const cleanEmail = safeStr(email).toLowerCase();
    const cleanPassword = safeStr(password);

    // Basic validation (keep strict but simple)
    if (!cleanName) {
      return res.status(400).json({ ok: false, error: "Name is required." });
    }
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res
        .status(400)
        .json({ ok: false, error: "A valid email is required." });
    }
    if (!cleanPassword || cleanPassword.length < 8) {
      return res.status(400).json({
        ok: false,
        error: "Password must be at least 8 characters.",
      });
    }

    const db = await getDb();
    const users = db.collection("users");

    // Check if a user already exists for this email
    const existing = await users.findOne<{
      _id: any;
      password?: string;
      name?: string;
    }>({ email: cleanEmail }, { projection: { _id: 1, password: 1, name: 1 } });

    const passwordHash = await bcrypt.hash(cleanPassword, 12);

    if (existing) {
      // If user already has a password, treat as already registered (non-fatal)
      if (existing.password && typeof existing.password === "string") {
        return res.status(200).json({
          ok: true,
          userId: String(existing._id),
          alreadyExists: true,
        });
      }

      // If user exists (e.g., via social login) but no password is set,
      // upgrade account to also support credentials.
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: cleanName || existing.name || "",
            password: passwordHash,
            phone: safeStr(phone) || undefined,
            address: address
              ? {
                  line1: safeStr(address.line1),
                  line2: safeStr(address.line2),
                  city: safeStr(address.city),
                  state: safeStr(address.state),
                  postal_code: safeStr(address.postal_code),
                  country: safeStr(address.country),
                }
              : undefined,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        }
      );

      return res.status(200).json({
        ok: true,
        userId: String(existing._id),
        upgradedFromSocial: true,
      });
    }

    // Create a brand-new credentials user
    const insert = await users.insertOne({
      name: cleanName,
      email: cleanEmail,
      password: passwordHash, // keep consistent with your existing users schema
      phone: safeStr(phone) || undefined,
      address: address
        ? {
            line1: safeStr(address.line1),
            line2: safeStr(address.line2),
            city: safeStr(address.city),
            state: safeStr(address.state),
            postal_code: safeStr(address.postal_code),
            country: safeStr(address.country),
          }
        : undefined,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res
      .status(200)
      .json({ ok: true, userId: String(insert.insertedId) });
  } catch (err: any) {
    console.error("[/api/register] error:", err);
    // Duplicate key safety (if unique index on email exists)
    if (err?.code === 11000) {
      return res
        .status(200)
        .json({ ok: true, userId: "", alreadyExists: true });
    }
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
}
