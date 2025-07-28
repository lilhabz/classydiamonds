// ✅ pages/api/webhook.ts – Enhanced Stripe Webhook to safely capture shipping info + price accuracy
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";

export const config = { api: { bodyParser: false } };

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

  // 1️⃣ Verify Stripe signature
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

  // 2️⃣ Only handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    console.log("🔍 METADATA:", metadata);
    console.log(
      "📦 SHIPPING_DETAILS:",
      (session as any).shipping_details,
      session.collected_information?.shipping_details
    );

    // 3️⃣ Parse items from metadata
    const items: Array<{
      name: string;
      quantity: number;
      originalPrice: number;
      salePrice: number;
      image?: string;
    }> = JSON.parse((metadata.items as string) || "[]");

    // 4️⃣ Pull Stripe’s collected shipping (or fallback)
    const rawShipping =
      (session as any).shipping_details ||
      session.collected_information?.shipping_details ||
      {};
    const addr = rawShipping.address || {};

    // 5️⃣ Normalize address (Stripe first, then metadata)
    let shippingAddressObject: {
      street?: string;
      line2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    } | null = null;
    let shippingAddressString = metadata.customer_address || "";

    if (addr.line1) {
      shippingAddressObject = {
        street: addr.line1,
        line2: addr.line2 || "",
        city: addr.city || "",
        state: addr.state || "",
        zip: addr.postal_code || "",
        country: addr.country || "",
      };
      shippingAddressString = [
        addr.line1,
        addr.line2,
        addr.city,
        addr.state && addr.postal_code
          ? `${addr.state} ${addr.postal_code}`
          : addr.postal_code,
        addr.country,
      ]
        .filter(Boolean)
        .join(", ");
    } else if (metadata.customer_address) {
      shippingAddressObject = { street: metadata.customer_address };
      shippingAddressString = metadata.customer_address;
    }

    // 6️⃣ Determine customer name & email
    const shippingName =
      rawShipping.name ||
      session.customer_details?.name ||
      metadata.customer_name ||
      "Customer";
    const customerEmail =
      session.customer_details?.email ||
      metadata.customer_email ||
      process.env.EMAIL_USER!;

    // 7️⃣ Other session info
    const amountTotal = (session.amount_total || 0) / 100;
    const orderDate = new Date();
    const orderNumber = metadata.orderNumber || "";

    // 8️⃣ Persist order to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const ordersCollection = db.collection("orders");
    const countersCollection = db.collection<{
      _id: string;
      sequence_value: number;
    }>("counters");

    let seqNumber: number;
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
      seqNumber = counterResult.value?.sequence_value || Date.now();
    } catch (err) {
      console.error("❌ Order number fallback:", err);
      seqNumber = Date.now();
    }

    const existing = await ordersCollection.findOne({
      stripeSessionId: session.id,
    });
    if (!existing) {
      const orderDoc = {
        orderNumber: seqNumber,
        customerName: shippingName,
        customerEmail,
        customerAddress: shippingAddressString,
        address: shippingAddressObject,
        items,
        amount: amountTotal,
        currency: session.currency || "usd",
        paymentStatus: session.payment_status || "unpaid",
        stripeSessionId: session.id,
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
      console.log(`✅ Order #${seqNumber} saved to MongoDB`);
    } else {
      console.log("⚠️ Order already exists – skipping insert.");
    }

    // 9️⃣ Build receipt rows with accurate pricing and discounts
    const itemRows = items
      .map((item) => {
        const orig = item.originalPrice;
        const sale = item.salePrice;
        const unitPriceHTML =
          sale < orig
            ? `<span style=\"text-decoration:line-through;\">$${orig.toFixed(
                2
              )}</span> <span style=\"color:red;\">$${sale.toFixed(2)}</span>`
            : `$${orig.toFixed(2)}`;
        const subtotal = ((sale < orig ? sale : orig) * item.quantity).toFixed(
          2
        );
        return `
          <tr>
            <td style=\"padding:8px;border:1px solid #ddd;\">
              <div style=\"display:flex;align-items:center;gap:10px;\">
                ${
                  item.image
                    ? `<img src=\"${item.image}\" alt=\"${item.name}\" style=\"width:50px;height:50px;object-fit:cover;border-radius:4px;\" />`
                    : ""
                }
                <span>${item.name}</span>
              </div>
            </td>
            <td style=\"padding:8px;border:1px solid #ddd;\">${
              item.quantity
            }</td>
            <td style=\"padding:8px;border:1px solid #ddd;\">${unitPriceHTML}</td>
            <td style=\"padding:8px;border:1px solid #ddd;\">$${subtotal}</td>
          </tr>`;
      })
      .join("");

    // 10️⃣ Compose the full email HTML without the Session line
    const htmlContent = `
      <div style=\"font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto;\">
        <h2 style=\"color:#1f2a44;\">Thank You, ${shippingName}!</h2>
        <p><strong>Order #${seqNumber}</strong></p>
        <p><strong>Date:</strong> ${orderDate.toLocaleString()}</p>
        <table style=\"width:100%;border-collapse:collapse;margin-top:20px;\">
          <thead>
            <tr style=\"background:#f2f2f2;\">
              <th style=\"padding:8px;border:1px solid #ddd;\">Item</th>
              <th style=\"padding:8px;border:1px solid #ddd;\">Qty</th>
              <th style=\"padding:8px;border:1px solid #ddd;\">Unit Price</th>
              <th style=\"padding:8px;border:1px solid #ddd;\">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        <p style=\"margin-top:20px;\"><strong>Shipping to:</strong><br>${shippingAddressString}</p>
        <p><strong>Total:</strong> $${amountTotal.toFixed(2)}</p>
        <hr style=\"margin:30px 0;\">
        <p style=\"font-size:14px;\">Questions? <a href=\"mailto:support@classydiamonds.com\">support@classydiamonds.com</a><br>Classy Diamonds, 123 Sparkle Lane, Philadelphia, PA 19106</p>
      </div>
    `;

    // 11️⃣ Send the email via Nodemailer
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"Classy Diamonds" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `💎 Receipt – Order #${seqNumber}`,
        html: htmlContent,
      });
      console.log("📧 Receipt sent to:", customerEmail);
    } catch (emailErr: any) {
      console.error("❌ Email error:", emailErr);
    }
  }

  // Always acknowledge receipt
  res.status(200).json({ received: true });
}
