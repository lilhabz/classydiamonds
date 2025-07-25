// ✅ Enhanced Stripe Webhook to safely capture shipping info + price accuracy
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
    const session = event.data.object as any;

    // 🧾 Log metadata + shipping
    console.log("🔍 Stripe metadata:", session.metadata);
    console.log("📦 Shipping details:", session.shipping_details);

    const metadata = session.metadata || {};
    const items = JSON.parse((metadata.items as string) || "[]");

    const shippingDetails = session.shipping || {};

    const shipAddr = (shippingDetails as any).address || {};

    const shippingAddressObject = {
      street: (shipAddr as any).line1 || metadata.address_street1 || "",
      line2: (shipAddr as any).line2 || metadata.address_street2 || "",
      city: (shipAddr as any).city || metadata.address_city || "",
      state: (shipAddr as any).state || metadata.address_state || "",
      zip: (shipAddr as any).postal_code || metadata.address_zip || "",
      country: (shipAddr as any).country || metadata.address_country || "",
    };

    const shippingAddress = `${shippingAddressObject.street}${
      shippingAddressObject.line2 ? `, ${shippingAddressObject.line2}` : ""
    }, ${shippingAddressObject.city}, ${shippingAddressObject.state} ${
      shippingAddressObject.zip
    }, ${shippingAddressObject.country}`;

    const shippingName =
      (shippingDetails as any).name ||
      session.customer_details?.name ||
      metadata.customer_name ||
      "Customer";

    const customerName = shippingName;
    const customerEmail =
      session.customer_details?.email ||
      metadata.customer_email ||
      process.env.EMAIL_USER;

    const addressObject = shippingAddressObject;
    const customerAddress = shippingAddress;

    const amountTotal = (session.amount_total || 0) / 100;
    const stripeSessionId = session.id;
    const orderDate = new Date().toLocaleString();

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
      const orderDoc: any = {
        orderNumber,
        customerName,
        customerEmail,
        customerAddress,
        address: addressObject,
        items,
        amount: amountTotal,
        currency: session.currency || "usd",
        paymentStatus: session.payment_status || "unpaid",
        stripeSessionId,
        createdAt: new Date(),
        trackingNumber: "",
        carrier: "",
        shipped: false,
        delivered: false,
        archived: false,
        shipping_name: shippingName,
        shipping_address: shippingAddressObject,
        shipping_address_string: shippingAddress,
      };

      await ordersCollection.insertOne(orderDoc);
      console.log(`✅ Order #${orderNumber} saved to MongoDB`);
    } else {
      console.log("⚠️ Order already exists – skipping insert.");
    }

    // ✉️ Email Receipt
    try {
      const itemRows = items
        .map((item: any) => {
          const price = item.price ?? item.discountedPrice ?? 0;
          return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${item.image}" alt="${
            item.name
          }" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
                <span>${item.name}</span>
              </div>
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
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
          <h2 style="color: #1f2a44;">Thank You for Your Order, ${customerName}!</h2>
          <p>Your order has been received and an email receipt is below. Your <strong>Order #${orderNumber}</strong> has been assigned. 🎉</p>
          <p><strong>Order ID:</strong> ${orderNumber}<br>
          <strong>Stripe Session:</strong> ${stripeSessionId}<br>
          <strong>Order Date:</strong> ${orderDate}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th align="left" style="padding: 8px; border: 1px solid #ddd;">Item</th>
                <th align="left" style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
                <th align="left" style="padding: 8px; border: 1px solid #ddd;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="margin-top: 20px;"><strong>Shipping to:</strong><br>${shippingAddress}</p>
          <p><strong>Total:</strong> $${amountTotal.toFixed(2)}</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 14px;">
            If you have any questions about your order, please contact us at
            <a href="mailto:support@classydiamonds.com">support@classydiamonds.com</a><br>
            <strong>Classy Diamonds</strong><br>
            123 Sparkle Lane<br>
            Philadelphia, PA 19106
          </p>
          <p style="margin-top: 30px; font-size: 14px; color: #777;">
            Thank you again for choosing Classy Diamonds. We appreciate your trust! 💎
          </p>
        </div>
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
        subject: `💎 Your Classy Diamonds Receipt – Order #${orderNumber}`,
        html: htmlContent,
      });

      console.log("📧 Receipt sent to:", customerEmail);
    } catch (emailErr) {
      console.error("❌ Email error:", emailErr);
    }
  }

  res.status(200).json({ received: true });
}
