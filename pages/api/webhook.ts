// 📩 pages/api/webhook.ts – Stripe + Account Address Fallback (Size-aware emails) 💎

import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const config = {
  api: { bodyParser: false },
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
    const orderId = metadata.orderId;

    if (!orderId) {
      console.error("❌ No orderId found in metadata");
      return res.status(400).json({ error: "Missing orderId" });
    }

    // 🔍 Load order from DB
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const ordersCollection = db.collection("orders");

    const existingOrder = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
    });
    if (!existingOrder) {
      console.error(`❌ No order found in DB for ID ${orderId}`);
      return res.status(404).json({ error: "Order not found" });
    }

    const items = existingOrder.items || [];

    // ✅ Address preference: Stripe shipping_details → customer_details → DB fallback
    const stripeAddr =
      session.shipping_details?.address ||
      session.customer_details?.address ||
      existingOrder.address ||
      null;

    const stripeName =
      metadata.customer_name ||
      session.shipping_details?.name ||
      session.customer_details?.name ||
      existingOrder.customerName ||
      "Customer";

    const shippingAddressObject = {
      street: stripeAddr?.line1 || existingOrder.address?.street1 || "",
      line2: stripeAddr?.line2 || existingOrder.address?.street2 || "",
      city: stripeAddr?.city || existingOrder.address?.city || "",
      state: stripeAddr?.state || existingOrder.address?.state || "",
      zip: stripeAddr?.postal_code || existingOrder.address?.zip || "",
      country: stripeAddr?.country || existingOrder.address?.country || "",
    };

    const shippingAddressString = `${shippingAddressObject.street}${
      shippingAddressObject.line2 ? `, ${shippingAddressObject.line2}` : ""
    }, ${shippingAddressObject.city}, ${shippingAddressObject.state} ${
      shippingAddressObject.zip
    }, ${shippingAddressObject.country}`;

    const customerEmail =
      session.customer_details?.email ||
      existingOrder.customerEmail ||
      process.env.EMAIL_USER;

    console.log("📦 Shipping Address Saved:", shippingAddressObject);

    const amountTotal = (session.amount_total || 0) / 100;
    const stripeSessionId = session.id;

    // 🔢 Generate order number (keep existing or create new)
    let orderNumber = existingOrder.orderNumber;
    if (!orderNumber) {
      const countersCollection = db.collection<{
        _id: string;
        sequence_value: number;
      }>("counters");
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
      } catch {
        orderNumber = Date.now();
      }
    }

    // 💾 Update order status
    await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          orderNumber,
          customerName: stripeName,
          customerEmail,
          customerAddress: shippingAddressString,
          shipping_address: shippingAddressObject,
          shipping_address_string: shippingAddressString,
          amount: amountTotal,
          currency: session.currency || "usd",
          paymentStatus: session.payment_status || "unpaid",
          stripeSessionId,
          paidAt: new Date(),
        },
      }
    );

    console.log(`✅ Order #${orderNumber} marked as paid`);

    // 📧 Send receipt email (now shows ring size when present)
    try {
      const itemRows = items
        .map((item: any) => {
          const price =
            item.salePrice ??
            item.discountedPrice ??
            item.originalPrice ??
            item.price ??
            0;

          const sizeBadge = item.size
            ? `<div style="margin-top:4px;">
                 <span style="display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:#364763;color:#fff;">
                   Size: ${item.size}
                 </span>
               </div>`
            : "";

          return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${item.image}" alt="${
            item.name
          }" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
                <div>
                  <div>${item.name}</div>
                  ${sizeBadge}
                </div>
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
        <h2>Thank You for Your Order, ${stripeName}!</h2>
        <p>Your <strong>Order #${orderNumber}</strong> has been received.</p>
        <p><strong>Shipping to:</strong><br>${shippingAddressString}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${itemRows}</tbody>
        </table>
        <p><strong>Total:</strong> $${amountTotal.toFixed(2)}</p>
      `;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
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
