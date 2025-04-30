// 📄 pages/api/contact.ts - Email + MongoDB storage + Logs for Debug

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const form = new IncomingForm({
    maxFileSize: 5 * 1024 * 1024,
    uploadDir: "/tmp",
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Form parsing error:", err);
      return res.status(500).json({ error: "File upload error." });
    }

    console.log("✅ Form parsed successfully.");
    console.log("📨 Fields received:", fields);

    const name = fields.name?.[0] || "";
    const email = fields.email?.[0] || "";
    const phone = fields.phone?.[0] || "";
    const type = fields.type?.[0];
    const preference = fields.preference?.[0];
    const message = fields.message?.[0];
    const customMessage = fields.customMessage?.[0];
    const formCategory = fields.formCategory?.[0];

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
        <h2 style="color: #1f2a44;">$${
          isCustom ? "New Custom Jewelry Inquiry" : "New Contact Message"
        }</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        ${type ? `<p><strong>Jewelry Type:</strong> ${type}</p>` : ""}
        ${
          preference
            ? `<p><strong>Preferred Contact:</strong> ${preference}</p>`
            : ""
        }
        <hr style="margin: 20px 0;" />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-line;">$${
          (isCustom ? customMessage : message)?.replace(/\n/g, "<br>") ||
          "No message provided."
        }</p>
      </div>
    `;

    const uploadedFile = files.file?.[0];

    // ✅ Store data in MongoDB
    try {
      console.log("🧠 Connecting to MongoDB...");
      console.log("🧪 MONGODB_URI:", process.env.MONGODB_URI);

      const client = await MongoClient.connect(process.env.MONGODB_URI!);
      const db = client.db("classydiamonds");
      const collection = db.collection("messages");

      const result = await collection.insertOne({
        name,
        email,
        phone,
        preference,
        message,
        customMessage,
        type,
        formCategory,
        submittedAt: new Date(),
        hasFile: !!uploadedFile,
      });

      console.log("✅ Message inserted into MongoDB:", result.insertedId);
      await client.close();
    } catch (err) {
      console.error("❌ MongoDB insert error:", err);
      return res
        .status(500)
        .json({ error: "Failed to save message to database" });
    }

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
        attachments: uploadedFile
          ? [
              {
                filename: uploadedFile.originalFilename || "upload.jpg",
                path: uploadedFile.filepath,
              },
            ]
          : [],
      });

      console.log("✅ Email sent to mikeh@burnsautogroup.com");
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ Email failed:", err);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });
}
