// 📄 pages/api/contact.ts - Vercel Serverless Function with Fancy Email

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const {
    name,
    email,
    phone,
    type,
    preference,
    message,
    sku,
    customMessage,
    type: formType,
  } = req.body;

  if (
    !name ||
    !email ||
    !phone ||
    !preference ||
    (!message && !customMessage)
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const isCustom = formType === "custom";
  const subject = isCustom
    ? `💎 New Custom Jewelry Request from ${name}`
    : `📩 New Message from ${name}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
      <h2 style="color: #1f2a44;">${
        isCustom ? "New Custom Jewelry Request" : "New Contact Message"
      }</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Preferred Contact:</strong> ${preference}</p>
      ${
        isCustom
          ? `<p><strong>Jewelry Type:</strong> ${type || "Not specified"}</p>`
          : sku
          ? `<p><strong>SKU #:</strong> ${sku}</p>`
          : ""
      }
      <hr style="margin: 20px 0;" />
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-line;">${(isCustom
        ? customMessage
        : message
      ).replace(/\n/g, "<br>")}</p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      replyTo: email,
      to: "mikeh@burnsautogroup.com",
      subject,
      html: htmlBody,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Email failed:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
}
