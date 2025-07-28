// 📦 pages/api/webhook.ts – Final Enhanced Webhook (Shipping Info Fixed) 💎

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    console.log("⚡️ Webhook hit:", event.type);
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Handle completed checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // 🛠 Items from metadata
    const metadata = session.metadata || {};
    const items = JSON.parse((metadata.items as string) || "[]");

    // 📦 Shipping details (works for remembered customers too)
    const shippingDetails = session.shipping_details || session.shipping || {};
    const shipAddr = shippingDetails.address || {};

    const shippingAddressObject = {
      street: shipAddr.line1 || "",
      line2: shipAddr.line2 || "",
      city: shipAddr.city || "",
      state: shipAddr.state || "",
      zip: shipAddr.postal_code || "",
      country: shipAddr.country || "",
    };

    const shippingAddressString = `${shippingAddressObject.street}${
      shippingAddressObject.line2 ? `, ${shippingAddressObject.line2}` : ""
    }, ${shippingAddressObject.city}, ${shippingAddressObject.state} ${
      shippingAddressObject.zip
    }, ${shippingAddressObject.country}`;

    const customerName =
      shippingDetails.name ||
      session.customer_details?.name ||
      metadata.customer_name ||
      "Customer";

    const customerEmail =
      session.customer_details?.email ||
      metadata.customer_email ||
      process.env.EMAIL_USER;

    const amountTotal = (session.amount_total || 0) / 100;
    const stripeSessionId = session.id;

    // ✅ Save to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const ordersCollection = db.collection("orders");
    const countersCollection = db.collection<{
      _id: string;
      sequence_value: number;
    }>("counters");

    let orderNumber: number;
    try {
      const counterResult = await countersCollection.findOneAndUpdate(
        { _id: "orderNumber" },
        { $inc: { sequence_value: 1 } },
        {
          returnDocument: "after",
          upsert: true,
          projection: { sequence_value: 1 },
        }
      );
      orderNumber = counterResult.value?.sequence_value || 100;
    } catch (err) {
      console.error("❌ Order number fallback:", err);
      orderNumber = Date.now();
    }

    // 🛑 Prevent duplicates
    const existing = await ordersCollection.findOne({ stripeSessionId });
    if (!existing) {
      await ordersCollection.insertOne({
        orderNumber,
        customerName,
        customerEmail,
        customerAddress: shippingAddressString,
        shipping_address: shippingAddressObject,
        shipping_address_string: shippingAddressString,
        items,
        amount: amountTotal,
        currency: session.currency || "usd",
        paymentStatus: session.payment_status || "unpaid",
        stripeSessionId,
        createdAt: new Date(),
        shipped: false,
        delivered: false,
        archived: false,
      });
      console.log(`✅ Order #${orderNumber} saved to MongoDB`);
    }

    // 📧 Send receipt email
    try {
      const itemRows = items
        .map((item: any) => {
          const price = item.discountedPrice ?? item.price ?? 0;
          return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${item.name}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">x${
              item.quantity
            }</td>
            <td style="padding: 8px; border: 1px solid #ddd;">$${(
              price * item.quantity
            ).toFixed(2)}</td>
          </tr>`;
        })
        .join("");

      const htmlContent = `
        <h2>Thank You for Your Order, ${customerName}!</h2>
        <p>Your <strong>Order #${orderNumber}</strong> has been received.</p>
        <p><strong>Shipping to:</strong><br>${shippingAddressString}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${itemRows}</tbody>
        </table>
        <p><strong>Total:</strong> $${amountTotal.toFixed(2)}</p>
      `;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Classy Diamonds" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `💎 Order Receipt – #${orderNumber}`,
        html: htmlContent,
      });

      console.log("📧 Receipt sent to:", customerEmail);
    } catch (emailErr) {
      console.error("❌ Email error:", emailErr);
    }
  }

  res.status(200).json({ received: true });
}
