// ✅ pages/api/webhook.ts – Stripe Order Handler with Sequential orderNumber (starting at 100) plus shipped/archived 👇

// (Full file – do NOT remove any existing lines. We’ve only inserted a few type annotations
// to let TypeScript know that counters._id is a string.)

import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";

// 🛑 Disable bodyParser so we can verify Stripe signatures
export const config = {
  api: {
    bodyParser: false,
  },
};

// 🏗️ Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

// 🔑 Your Stripe webhook signing secret (set this in env)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    // 🔄 Read raw request body to validate Stripe signature
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
      // 🔐 Verify event using Stripe’s library
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      console.log("⚡️ Webhook hit");
      console.log("🧪 Stripe event type:", event.type);
    } catch (err: any) {
      console.error("❌ Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 👀 Handle only the “checkout.session.completed” event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // 🔍 Pull metadata and compute basic order fields
      const metadata = session.metadata || {};
      const customerEmail =
        (metadata.customer_email as string) || process.env.EMAIL_USER;
      const customerName = (metadata.customer_name as string) || "Customer";
      const customerAddress = (metadata.customer_address as string) || "N/A";
      const items = JSON.parse((metadata.items as string) || "[]");
      const amountTotal = (session.amount_total || 0) / 100;
      const orderDate = new Date().toLocaleString();
      const stripeSessionId = session.id; // e.g. "cs_test_ABC123"

      // 🔗 Connect to MongoDB
      const dbClient = await clientPromise;
      const db = dbClient.db();
      const ordersCollection = db.collection("orders");

      // 👇 Here is the important part: tell TypeScript that counters docs are { _id: string, sequence_value: number }
      type CounterDoc = { _id: string; sequence_value: number };
      const countersCollection = db.collection<CounterDoc>("counters");

      let orderNumber: number;

      try {
        // 🔢 Generate a sequential orderNumber (starting at 100)
        //    Because we typed countersCollection as <CounterDoc>, _id can be a string.
        const counterResult = await countersCollection.findOneAndUpdate(
          { _id: "orderNumber" }, // <- no TS error now, "_id" is string
          { $inc: { sequence_value: 1 } },
          {
            returnDocument: "after", // after increment
            upsert: true, // create if missing
            projection: { sequence_value: 1 },
          }
        );

        // If this was the first run, sequence_value may be undefined until we insert below
        if (!counterResult.value?.sequence_value) {
          // Initialize to 100 if missing
          await countersCollection.insertOne({
            _id: "orderNumber",
            sequence_value: 100,
          });
          orderNumber = 100;
        } else {
          orderNumber = counterResult.value.sequence_value;
        }

        console.log(`🔢 Generated orderNumber: ${orderNumber}`);
      } catch (counterErr) {
        console.error("❌ Counter generation error:", counterErr);
        // Fallback: use timestamp-based number (not recommended long-term)
        orderNumber = Date.now();
      }

      // 👤 Check if this Stripe session has already been recorded (idempotency)
      try {
        const existing = await ordersCollection.findOne({
          stripeSessionId,
        });

        if (!existing) {
          // 🗄️ Insert new order document with our sequential orderNumber
          await ordersCollection.insertOne({
            orderNumber, // 🆕 Our own human-friendly order number
            customerName,
            customerEmail,
            customerAddress,
            address: {
              street: metadata.address_street || "",
              city: metadata.address_city || "",
              state: metadata.address_state || "",
              zip: metadata.address_zip || "",
              country: metadata.address_country || "",
            },
            items,
            amount: amountTotal,
            currency: session.currency || "usd",
            paymentStatus: session.payment_status || "unpaid",
            stripeSessionId, // original Stripe ID
            createdAt: new Date(),
            shipped: false,
            archived: false,
          });

          console.log(
            `✅ Order saved to MongoDB with orderNumber: ${orderNumber}`
          );
        } else {
          console.log("⚠️ Order already exists in MongoDB – skipping insert.");
        }
      } catch (mongoErr) {
        console.error("❌ MongoDB insert error:", mongoErr);
      }

      // ✉️ Send receipt email (this runs regardless of upsert result to ensure email goes out once)
      try {
        // Build HTML for receipt
        const itemRows = items
          .map(
            (item: any) => `
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
                item.price * item.quantity
              ).toFixed(2)}</td>
            </tr>`
          )
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
            
            <p style="margin-top: 20px;"><strong>Shipping to:</strong><br>${customerAddress}</p>
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

        // Configure Nodemailer transporter
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        // Mail options
        const mailOptions = {
          from: `"Classy Diamonds" <${process.env.EMAIL_USER}>`,
          to: customerEmail,
          subject: `💎 Your Classy Diamonds Receipt – Order #${orderNumber}`,
          html: htmlContent,
        };

        await transporter.sendMail(mailOptions);
        console.log("📧 Receipt email sent to:", customerEmail);
      } catch (emailErr) {
        console.error("❌ Email sending failed:", emailErr);
      }
    }

    // 200 response so Stripe knows we received the event
    res.status(200).json({ received: true });
  } else {
    // Return 405 for other HTTP methods
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
