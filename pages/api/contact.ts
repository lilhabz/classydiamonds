// 📄 pages/api/contact.ts - Vercel Serverless Function

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const { name, email, message, phone, jewelryType, customMessage } = req.body;

  if (!name || !email || (!message && !customMessage)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER, // set this in your .env.local
      pass: process.env.GMAIL_PASS, // Gmail app password only
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER, // ✅ This keeps Gmail happy
      to: "mikeh@burnsautogroup.com",
      subject: `New Contact from ${name}`,
      replyTo: email, // ✅ This makes "Reply" go to visitor
      text: `
        Name: ${name}
        Email: ${email}
        Phone: ${phone || "Not provided"}
        Jewelry Type: ${jewelryType || "Not specified"}

        Message:
        ${message || customMessage}
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Email failed:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
}
