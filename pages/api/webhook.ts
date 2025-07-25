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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // 1️⃣ Verify signature
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

  // 2️⃣ Only handle completed checkouts
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Log for debugging
    console.log("🔍 Stripe metadata:", session.metadata);
    console.log("📦 Shipping details:", (session as any).shipping_details);

    // 3️⃣ Parse your items array from metadata
    const metadata = session.metadata || {};
    const items = JSON.parse((metadata.items as string) || "[]");

    // 4️⃣ Pull the real shipping_details
    const shippingDetails = (session as any).shipping_details || {};
    const shipAddr = shippingDetails.address || {};

    // 5️⃣ Normalize address
    const shippingAddressObject = {
      street: shipAddr.line1 || metadata.address_street1 || "",
      line2: shipAddr.line2 || metadata.address_street2 || "",
      city: shipAddr.city || metadata.address_city || "",
      state: shipAddr.state || metadata.address_state || "",
      zip: shipAddr.postal_code || metadata.address_zip || "",
      country: shipAddr.country || metadata.address_country || "",
    };
    const shippingAddressString = `${shippingAddressObject.street}${
      shippingAddressObject.line2 ? `, ${shippingAddressObject.line2}` : ""
    }, ${shippingAddressObject.city}, ${shippingAddressObject.state} ${
      shippingAddressObject.zip
    }, ${shippingAddressObject.country}`;

    // 6️⃣ Determine customer name & email
    const shippingName =
      shippingDetails.name ||
      session.customer_details?.name ||
      metadata.customer_name ||
      "Customer";
    const customerName = shippingName;
    const customerEmail =
      session.customer_details?.email ||
      metadata.customer_email ||
      process.env.EMAIL_USER!;

    // 7️⃣ Other session info
    const amountTotal = (session.amount_total || 0) / 100;
    const stripeSessionId = session.id;
    const orderDate = new Date();

    // 8️⃣ Connect to Mongo
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const ordersCollection = db.collection("orders");
    const countersCollection = db.collection<{
      _id: string;
      sequence_value: number;
    }>("counters");

    // 9️⃣ Generate sequential order number
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
      orderNumber = counterResult.value?.sequence_value || Date.now();
    } catch (err) {
      console.error("❌ Order number fallback:", err);
      orderNumber = Date.now();
    }

    //  🔟 Avoid duplicates & insert
    const existing = await ordersCollection.findOne({ stripeSessionId });
    if (!existing) {
      const orderDoc = {
        orderNumber,
        customerName,
        customerEmail,
        customerAddress: shippingAddressString,
        address: shippingAddressObject,
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
        shipping_address_string: shippingAddressString,
      };
      await ordersCollection.insertOne(orderDoc);
      console.log(`✅ Order #${orderNumber} saved to MongoDB`);
    } else {
      console.log("⚠️ Order already exists – skipping insert.");
    }

    // 1️⃣1️⃣ Send email receipt
    try {
      const itemRows = items
        .map((item: any) => {
          // item.price here is the price per unit (original or sale)
          const unitPrice = item.price ?? item.discountedPrice ?? 0;
          const subtotal = (unitPrice * item.quantity).toFixed(2);
          return `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="${item.image}" alt="${item.name}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;" />
                  <span>${item.name}</span>
                </div>
              </td>
              <td style="padding:8px;border:1px solid #ddd;">x${item.quantity}</td>
              <td style="padding:8px;border:1px solid #ddd;">$${subtotal}</td>
            </tr>`;
        })
        .join("");

      const htmlContent = `
        <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto;">
          <h2 style="color:#1f2a44;">Thank You, ${customerName}!</h2>
          <p>Your <strong>Order #${orderNumber}</strong> has been received.</p>
          <p><strong>Session:</strong> ${stripeSessionId}<br>
          <strong>Date:</strong> ${orderDate.toLocaleString()}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:20px;">
            <thead>
              <tr style="background:#f2f2f2;">
                <th style="padding:8px;border:1px solid #ddd;">Item</th>
                <th style="padding:8px;border:1px solid #ddd;">Qty</th>
                <th style="padding:8px;border:1px solid #ddd;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          <p style="margin-top:20px;"><strong>Shipping to:</strong><br>${shippingAddressString}</p>
          <p><strong>Total:</strong> $${amountTotal.toFixed(2)}</p>
          <hr style="margin:30px 0;">
          <p style="font-size:14px;">
            Questions? <a href="mailto:support@classydiamonds.com">support@classydiamonds.com</a><br>
            Classy Diamonds, 123 Sparkle Lane, Philadelphia, PA 19106
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
        subject: `💎 Receipt – Order #${orderNumber}`,
        html: htmlContent,
      });

      console.log("📧 Receipt sent to:", customerEmail);
    } catch (emailErr) {
      console.error("❌ Email error:", emailErr);
    }
  }

  // Always return 200 to Stripe
  res.status(200).json({ received: true });
}
