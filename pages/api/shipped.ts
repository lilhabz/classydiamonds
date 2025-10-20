// 📤 pages/api/shipped.ts – Mark order as shipped + log admin action 🚚📝

import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { buildOrderDetailsHtml } from "@/lib/emailUtils";

export const runtime = "nodejs";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 Server-side admin check (keeps things tight even if UI is protected)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !(session.user as any)?.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { orderId, adminName } = req.body;
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

    // ⛑️ Idempotency: if already shipped, don't spam another email
    if (order.shipped) {
      return res.status(200).json({
        success: true,
        alreadyShipped: true,
        shippedAt: order.shippedAt || null,
      });
    }

    // 📦 Mark as shipped (preserve existing shippedAt if set for any reason)
    const shippedAt = order.shippedAt ? new Date(order.shippedAt) : new Date();
    await db
      .collection("orders")
      .updateOne(
        { stripeSessionId: orderId },
        { $set: { shipped: true, shippedAt } }
      );

    // 📝 Log the shipment in adminLogs
    await db.collection("adminLogs").insertOne({
      orderId,
      action: "shipped",
      timestamp: new Date(),
      performedBy: adminName || (session.user as any)?.name || "unknown",
    });

    // ✉️ Send shipping email (only if creds + recipient exist)
    const fromEmail = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const recipient = order.customerEmail;

    if (fromEmail && pass && recipient) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: fromEmail, pass },
      });

      // Name safety: avoid literal "Stripe"
      const safeName =
        typeof order.customerName === "string" &&
        order.customerName.trim().toLowerCase() !== "stripe"
          ? order.customerName
          : recipient?.split("@")[0]?.replace(/\./g, " ") || "Customer";

      const orderForEmail = { ...order, customerName: safeName };
      const orderDetails = buildOrderDetailsHtml(orderForEmail);

      const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
          <h2 style="color: #1f2a44;">Your Order Has Shipped! 📦</h2>
          <p>Hi ${safeName},</p>
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
        from: `"Classy Diamonds" <${fromEmail}>`,
        to: recipient,
        subject: "📦 Your Order Has Shipped!",
        html,
      });

      console.log("📬 Shipping email sent to:", recipient);
    } else {
      console.warn(
        "⚠️ Skipping shipping email: missing EMAIL_USER/EMAIL_PASS or recipient."
      );
    }

    return res.status(200).json({ success: true, shippedAt });
  } catch (err) {
    console.error("❌ Shipping error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
