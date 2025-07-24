// ✅ pages/api/webhook.ts – Stripe Order Handler with Sequential orderNumber (starting at 100) plus shipped/archived (with TS fixes) 👇

// (Full file – do NOT remove any existing lines. We’ve updated only the parts related to accessing address from metadata instead of shipping_details.)

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

      // 🔍 Pull customer details from session
      const customerName = session.customer_details?.name || "Customer";
      const customerEmail =
        session.customer_details?.email || process.env.EMAIL_USER;

      // 📦 Retrieve items from metadata (existing flow)
      const metadata = session.metadata || {};
      const items = JSON.parse((metadata.items as string) || "[]"); // 📦 Array of { name, quantity, price, image }

      // 🏠 Read address parts from metadata instead of shipping_details
      const street1 = (metadata.address_street1 as string) || "";
      const street2 = (metadata.address_street2 as string) || "";
      const city = (metadata.address_city as string) || "";
      const state = (metadata.address_state as string) || "";
      const zip = (metadata.address_zip as string) || "";
      const country = (metadata.address_country as string) || "";

      // 🌟 Build a single‐line address string
      const customerAddress = `${street1}${
        street2 ? `, ${street2}` : ""
      }, ${city}, ${state} ${zip}, ${country}`;

      // 🌐 Store structured address fields as well
      const addressObject = {
        street: street1,
        line2: street2,
        city,
        state,
        zip,
        country,
      };

      // 📮 Extract shipping details from the session
      const shippingDetails = session.shipping_details;
      const shippingName = shippingDetails?.name || "";
      const shippingAddr = shippingDetails?.address || {};
      const shipStreet = (shippingAddr as any).line1 || "";
      const shipLine2 = (shippingAddr as any).line2 || "";
      const shipCity = (shippingAddr as any).city || "";
      const shipState = (shippingAddr as any).state || "";
      const shipZip = (shippingAddr as any).postal_code || "";
      const shipCountry = (shippingAddr as any).country || "";

      const shippingAddress = `${shipStreet}${shipLine2 ? `, ${shipLine2}` : ""}, ${shipCity}, ${shipState} ${shipZip}, ${shipCountry}`;
      const shippingAddressObject = {
        street: shipStreet,
        line2: shipLine2,
        city: shipCity,
        state: shipState,
        zip: shipZip,
        country: shipCountry,
      };

      // 💲 Calculate total amount in dollars
      const amountTotal = (session.amount_total || 0) / 100;

      // 🕒 Human-friendly order date
      const orderDate = new Date().toLocaleString();

      // 🔗 Stripe session ID
      const stripeSessionId = session.id;

      // 🔗 Connect to MongoDB
      const dbClient = await clientPromise;
      const db = dbClient.db();
      const ordersCollection = db.collection("orders");

      // 👇 Tell TypeScript that counters docs are { _id: string, sequence_value: number }
      type CounterDoc = { _id: string; sequence_value: number };
      const countersCollection = db.collection<CounterDoc>("counters");

      let orderNumber: number;

      try {
        // 🔢 Generate a sequential orderNumber (starting at 100)
        const counterResult = await countersCollection.findOneAndUpdate(
          { _id: "orderNumber" },
          { $inc: { sequence_value: 1 } },
          {
            returnDocument: "after",
            upsert: true,
            projection: { sequence_value: 1 },
          }
        );

        if (!counterResult.value?.sequence_value) {
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
        orderNumber = Date.now();
      }

      // 👤 Check for idempotency
      try {
        const existing = await ordersCollection.findOne({
          stripeSessionId,
        });

        if (!existing) {
          // 🗄️ Insert new order document with all fields
          const orderDoc: any = {
            orderNumber,
            customerName,
            customerEmail,
            customerAddress, // single‐line address
            address: addressObject, // structured address
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

          console.log(
            `✅ Order saved to MongoDB with orderNumber: ${orderNumber}`
          );
        } else {
          console.log("⚠️ Order already exists – skipping insert.");
        }
      } catch (mongoErr) {
        console.error("❌ MongoDB insert error:", mongoErr);
      }

      // ✉️ Send receipt email via Nodemailer
      try {
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
