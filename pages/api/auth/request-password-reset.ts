// pages/api/auth/request-password-reset.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import clientPromise from "@/lib/mongodb";
import nodemailer from "nodemailer";

/**
 * Uses:
 * - EMAIL_USER, EMAIL_PASS (Gmail transport, same as signup.ts)
 * - NEXTAUTH_URL (falls back to req.headers.origin)
 *
 * Behavior:
 * - Always returns 200 to avoid email enumeration.
 * - Stores resetTokenHash (sha256) and resetTokenExpires (Date) on the user.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { email } = req.body || {};
  if (!email || typeof email !== "string") {
    return res.status(200).json({ ok: true }); // prevent enumeration
  }

  try {
    const client = await clientPromise;
    const db = client.db("classydiamonds");
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      // Return OK regardless of existence
      return res.status(200).json({ ok: true });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetTokenHash: tokenHash,
          resetTokenExpires: expiresAt,
        },
      }
    );

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (req.headers.origin ?? `https://${req.headers.host}`);
    const resetUrl = `${baseUrl}/account/reset-password?token=${rawToken}&email=${encodeURIComponent(
      email
    )}`;

    // Gmail transport to match signup.ts
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset your Classy Diamonds password",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2 style="margin:0 0 8px">Reset your password</h2>
          <p>You requested a password reset for your Classy Diamonds account.</p>
          <p>
            <a href="${resetUrl}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:10px 16px;border-radius:8px;background:#25304f;color:#fff;text-decoration:none">
              Reset Password
            </a>
          </p>
          <p>Or open this link:<br/><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="font-size:12px;color:#555">This link expires in 1 hour. If you didn’t request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("request-password-reset error:", err);
    // Still return 200 to avoid enumeration
    return res.status(200).json({ ok: true });
  }
}
