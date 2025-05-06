// 📤 pages/api/shipped.ts

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const order = await db
      .collection("orders")
      .findOne({ stripeSessionId: orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
        <h2 style="color: #1f2a44;">Your Order Has Shipped! 📦</h2>
        <p>Hi ${order.customerName},</p>
        <p>We’re excited to let you know that your order is officially on its way!</p>

        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Shipping to:</strong><br>${order.customerAddress}</p>
        <p><strong>Total:</strong> $${order.amount.toFixed(2)}</p>

        <p style="margin-top: 30px; font-size: 14px;">
          If you have any questions, reach us at
          <a href="mailto:support@classydiamonds.com">support@classydiamonds.com</a>
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #777;">
          Thank you again for choosing Classy Diamonds.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"Classy Diamonds" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: "📦 Your Order Has Shipped!",
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log("📬 Shipping email sent to:", order.customerEmail);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Shipping email error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
