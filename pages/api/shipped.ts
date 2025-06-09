// 📤 pages/api/shipped.ts – Mark order as shipped + log admin action 🚚📝

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { buildOrderDetailsHtml } from "@/lib/emailUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const { orderId, adminName: bodyName } = req.body;
  const adminName =
    bodyName ||
    session?.user?.firstName ||
    session?.user?.name?.split(" ")[0];

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

    // ✅ Update Mongo to mark as shipped
    await db
      .collection("orders")
      .updateOne(
        { stripeSessionId: orderId },
        { $set: { shipped: true, shippedAt: new Date() } }
      );

    // ✅ Log the shipment in adminLogs
    await db.collection("adminLogs").insertOne({
      orderId,
      action: "shipped",
      timestamp: new Date(),
      performedBy: adminName || "unknown",
    });

    // ✅ Send shipping email
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
        <h2 style="color: #1f2a44;">Your Order Has Shipped! 📦</h2>
        <p>Hi ${order.customerName},</p>
        <p>Your order has been carefully packaged and handed off for delivery.</p>
        ${orderDetails}

        <p style="margin-top: 30px; font-size: 14px;">
          If you have any questions, reply to this email or contact
          <a href="mailto:support@classydiamonds.com">support@classydiamonds.com</a>
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #777;">
          Thank you again for choosing Classy Diamonds.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Classy Diamonds" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: "📦 Your Order Has Shipped!",
      html,
    });

    console.log("📬 Shipping email sent to:", order.customerEmail);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Shipping email error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
