// 📄 pages/api/signup.ts – Signup Endpoint with Confirmation Email 💾

import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import crypto from "crypto";
import nodemailer from "nodemailer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 🚫 Only allow POST
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  // 📥 Extract fullName, email, password
  const { name: fullName, email, password } = req.body;
  if (!fullName || !email || !password)
    return res.status(400).json({ error: "Missing required fields" });

  // 🔄 Split fullName into firstName + lastName
  const [firstName, ...rest] = fullName.trim().split(" ");
  const lastName = rest.join(" ") || "";

  try {
    // 🔗 Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("classydiamonds");
    const users = db.collection("users");

    // 🔎 Check existing email
    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // 🔒 Hash the password & generate token
    const hashedPassword = await bcrypt.hash(password, 12);
    const confirmationToken = crypto.randomBytes(32).toString("hex");

    // 🆕 Insert user with parsed names and token
    await users.insertOne({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      emailConfirmed: false,
      confirmationToken,
      createdAt: new Date(),
    });

    // ✉️ Send confirmation email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    });

    // 🌐 Build base URL from NEXTAUTH_URL or request headers
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (req.headers.origin ?? `https://${req.headers.host}`);
    const confirmUrl = `${baseUrl}/api/confirm?token=${confirmationToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Confirm your Classy Diamonds account",
      html: `
        <p>Hi ${firstName},</p>
        <p>
          Thanks for signing up! Please confirm your email by clicking
          <a href="${confirmUrl}" target="_blank" rel="noopener noreferrer">
            here
          </a>
          (opens a new tab to log in).
        </p>
        <p>If you didn’t sign up, simply ignore this message.</p>
      `,
    });

    return res
      .status(201)
      .json({ message: "User created. Check your email to confirm." });
  } catch (err) {
    console.error("❌ Signup error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
