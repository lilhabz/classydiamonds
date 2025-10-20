// ✅ Fixed: pages/api/contact.ts
// - Forces Node runtime so it never runs on the Edge
// - Keeps formidable uploads + MongoDB + Gmail intact
// - Cleans up typings and prevents Vercel deploy crashes

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { IncomingForm } from "formidable";
import { MongoClient } from "mongodb";

// 🚀 Force Node runtime (required for formidable + nodemailer)
export const runtime = "nodejs";

// ⚙️ Disable bodyParser because formidable handles multipart forms
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const form = new IncomingForm({
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    uploadDir: "/tmp", // ✅ works in Vercel serverless tmp space
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Form parsing error:", err);
      return res.status(500).json({ error: "File upload error." });
    }

    console.log("✅ Form parsed successfully.");
    console.log("📨 Fields received:", fields);

    // Extract core fields
    const name = fields.name?.[0] || "";
    const email = fields.email?.[0] || "";
    const phone = (fields.phone?.[0] || "").trim();
    const type = fields.type?.[0];
    const message = fields.message?.[0];
    const customMessage = fields.customMessage?.[0];
    const formCategory = fields.formCategory?.[0];
    const itemNumber = fields.sku?.[0] || "";

    // Basic validation
    if (!name || !email || (!message && !customMessage)) {
      console.warn("⚠️ Missing required fields:", {
        name,
        email,
        message,
        customMessage,
      });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const isCustom = formCategory === "custom";
    const subject = isCustom
      ? `💍 New Custom Jewelry Inquiry from ${name}`
      : `📩 New Message from ${name}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
        <h2 style="color: #1f2a44;">${
          isCustom ? "New Custom Jewelry Inquiry" : "New Contact Message"
        }</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
        ${itemNumber ? `<p><strong>Item Number:</strong> ${itemNumber}</p>` : ""}
        ${type ? `<p><strong>Jewelry Type:</strong> ${type}</p>` : ""}
        <hr style="margin: 20px 0;" />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-line;">${
          (isCustom ? customMessage : message)?.replace(/\n/g, "<br>") ||
          "No message provided."
        }</p>
      </div>
    `;

    const uploadedFile = files.file?.[0];

    // 🧠 Store in MongoDB
    try {
      console.log("🧠 Connecting to MongoDB...");
      const client = await MongoClient.connect(process.env.MONGODB_URI!);
      const db = client.db("classydiamonds");
      const collection = db.collection("messages");

      const result = await collection.insertOne({
        name,
        email,
        phone,
        itemNumber,
        message,
        customMessage,
        type,
        formCategory,
        submittedAt: new Date(),
        hasFile: !!uploadedFile,
      });

      console.log("✅ Message saved:", result.insertedId);
      await client.close();
    } catch (dbErr) {
      console.error("❌ MongoDB insert error:", dbErr);
      return res.status(500).json({ error: "Database save failed" });
    }

    // ✉️ Send email notification
    try {
      const fromEmail = process.env.GMAIL_USER;
      const pass = process.env.GMAIL_PASS;

      if (!fromEmail || !pass) {
        console.error("❌ Missing Gmail credentials in env vars");
        return res
          .status(500)
          .json({ error: "Email configuration missing on server" });
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: fromEmail, pass },
      });

      await transporter.sendMail({
        from: `"Classy Diamonds" <${fromEmail}>`,
        replyTo: email,
        to: "mikeh@burnsautogroup.com",
        subject,
        html: htmlBody,
        attachments: uploadedFile
          ? [
              {
                filename: uploadedFile.originalFilename || "upload.jpg",
                path: uploadedFile.filepath,
              },
            ]
          : [],
      });

      console.log("✅ Email sent successfully to mikeh@burnsautogroup.com");
      return res.status(200).json({ success: true });
    } catch (emailErr) {
      console.error("❌ Email failed:", emailErr);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });
}
