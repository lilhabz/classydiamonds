// 📦 pages/api/webhook.ts – Final Enhanced Webhook (Shipping Info Fixed + TS Safe) 💎

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

  if (event.type === "checkout.session.completed") {
    // 🔑 Force-cast so we can access shipping_details without TS error
    const session = event.data.object as Stripe.Checkout.Session & {
      shipping_details?: {
        name?: string;
        address?: {
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
        };
      };
    };

    const metadata = session.metadata || {};
    const items: Array<any> = JSON.parse((metadata.items as string) || "[]");

    // 📦 Shipping details (safe)
    const shippingDetails = session.shipping_details || null;
    const shipAddr = shippingDetails?.address || null;

    const shippingAddressObject = {
      street: shipAddr?.line1 || metadata.address_street1 || "",
      line2: shipAddr?.line2 || metadata.address_street2 || "",
      city: shipAddr?.city || metadata.address_city || "",
      state: shipAddr?.state || metadata.address_state || "",
      zip: shipAddr?.postal_code || metadata.address_zip || "",
      country: shipAddr?.country || metadata.address_country || "",
    };

    const shippingAddressString = `${shippingAddressObject.street}${
      shippingAddressObject.line2 ? `, ${shippingAddressObject.line2}` : ""
    }, ${shippingAddressObject.city}, ${shippingAddressObject.state} ${
      shippingAddressObject.zip
    }, ${shippingAddressObject.country}`;

    const customerName =
      shippingDetails?.name ||
      session.customer_details?.name ||
      metadata.customer_name ||
      "Customer";

    const customerEmail =
      session.customer_details?.email ||
      metadata.customer_email ||
      process.env.EMAIL_USER;

    const amountTotal = (session.amount_total || 0) / 100;
    const stripeSessionId = session.id;

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
      console.log("📦 Shipping Address Saved:", shippingAddressObject);
    }

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
