// 📥 pages/api/delivered.ts – Mark order as delivered + log admin action 📬📝
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { buildOrderDetailsHtml } from "@/lib/emailUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }


  const { orderId, adminName } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const order = await db
      .collection("orders")
      .findOne({ stripeSessionId: orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    await db.collection("orders").updateOne(
      { stripeSessionId: orderId },
      { $set: { delivered: true, deliveredAt: new Date() } }
    );

    await db.collection("adminLogs").insertOne({
      orderId,
      action: "delivered",
      timestamp: new Date(),
      performedBy: adminName || "unknown",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const orderDetails = buildOrderDetailsHtml(order);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
        <h2 style="color: #1f2a44;">Your Order Was Delivered</h2>
        <p>Hi ${order.customerName},</p>
        <p>We have confirmed that your order has been delivered. We hope you enjoy your purchase!</p>
        ${orderDetails}
        <p style="margin-top: 30px; font-size: 14px;">
          If you have any questions, reply to this email or contact
          <a href="mailto:support@classydiamonds.com">support@classydiamonds.com</a>
        </p>
      </div>`;

    await transporter.sendMail({
      from: `"Classy Diamonds" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: "📬 Your Order Was Delivered",
      html,
    });

    console.log("📧 Delivered email sent to:", order.customerEmail);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Failed to mark delivered:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
