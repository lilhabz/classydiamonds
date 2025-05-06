// 📂 pages/api/webhook.ts

import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log("⚡️ Webhook hit");
      console.log("🧪 Stripe event type:", event.type);
    } catch (err: any) {
      console.error("❌ Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const metadata = session.metadata || {};
      const customerEmail = metadata.customer_email || process.env.EMAIL_USER;
      const customerName = metadata.customer_name || "Customer";
      const customerAddress = metadata.customer_address || "N/A";
      const items = JSON.parse(metadata.items || "[]");
      const amountTotal = (session.amount_total || 0) / 100;

      const itemDetails = items
        .map(
          (item: any) =>
            `• ${item.name} x${item.quantity} - $${(
              item.price * item.quantity
            ).toFixed(2)}`
        )
        .join("\n");

      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const mailOptions = {
          from: `"Classy Diamonds" <${process.env.EMAIL_USER}>`,
          to: customerEmail,
          subject: "💎 Your Classy Diamonds Receipt",
          text: `Hi ${customerName},

Thank you for your order! Here's your receipt:

${itemDetails}

Shipping to:
${customerAddress}

Total: $${amountTotal.toFixed(2)}

We appreciate your business and will be in touch soon.

– Classy Diamonds`,
        };

        await transporter.sendMail(mailOptions);
        console.log("📧 Receipt email sent to:", customerEmail);
      } catch (emailErr) {
        console.error("❌ Email sending failed:", emailErr);
      }

      try {
        const dbClient = await clientPromise;
        const db = dbClient.db();
        const orders = db.collection("orders");

        const existing = await orders.findOne({ stripeSessionId: session.id });

        if (!existing) {
          await orders.insertOne({
            customerName,
            customerEmail,
            customerAddress,
            items,
            amount: amountTotal,
            currency: session.currency || "usd",
            paymentStatus: session.payment_status || "unpaid",
            stripeSessionId: session.id,
            createdAt: new Date(),
          });

          console.log("✅ Order saved to MongoDB (via webhook)");
        } else {
          console.log("⚠️ Order already exists — skipped Mongo insert.");
        }
      } catch (mongoErr) {
        console.error("❌ MongoDB insert error:", mongoErr);
      }
    }

    res.status(200).json({ received: true });
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
