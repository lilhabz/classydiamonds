// ✅ Fixed: pages/api/webhook.ts
// - Forces Node runtime to avoid Edge mis-deployment on Vercel
// - Keeps raw body config for Stripe signature verification
// - Matches your installed Stripe SDK type version
// - No dotenv required (Vercel injects env automatically)

import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// 🚀 Force Node runtime — absolutely required for Stripe + Nodemailer
export const runtime = "nodejs";

// 🔒 Stripe requires raw request body
export const config = {
  api: { bodyParser: false },
};

// Initialize Stripe with your SDK’s pinned version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil" as any, // 👈 keeps type compatibility
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  let event: Stripe.Event;
  try {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"] as string;
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

    const items = Array.isArray(existingOrder.items) ? existingOrder.items : [];

    // ✅ Address preference: Stripe → existing DB
    const stripeAddr =
      session.shipping_details?.address ||
      session.customer_details?.address ||
      (existingOrder as any).address ||
      null;

    // ✅ Name preference chain
    let customerName =
      (session?.customer_details?.name || "").trim() ||
      (session?.shipping_details?.name || "").trim() ||
      (
        (metadata as any).customerName ||
        (metadata as any).name ||
        (metadata as any).fullName ||
        ""
      ).trim() ||
      ((existingOrder as any).customerName || "").trim() ||
      "Unknown";

    if (customerName.toLowerCase() === "stripe") {
      customerName =
        ((existingOrder as any).customerName || "").trim() ||
        ((metadata as any).customerName || "").trim() ||
        "Unknown";
    }

    const shippingAddressObject = {
      street:
        stripeAddr?.line1 ||
        (existingOrder as any).address?.line1 ||
        (existingOrder as any).address?.street1 ||
        "",
      line2:
        stripeAddr?.line2 ||
        (existingOrder as any).address?.line2 ||
        (existingOrder as any).address?.street2 ||
        "",
      city: stripeAddr?.city || (existingOrder as any).address?.city || "",
      state: stripeAddr?.state || (existingOrder as any).address?.state || "",
      zip:
        stripeAddr?.postal_code ||
        (existingOrder as any).address?.postal_code ||
        (existingOrder as any).address?.zip ||
        "",
      country:
        stripeAddr?.country || (existingOrder as any).address?.country || "",
    };

    const shippingAddressString = `${shippingAddressObject.street}${
      shippingAddressObject.line2 ? `, ${shippingAddressObject.line2}` : ""
    }, ${shippingAddressObject.city}, ${shippingAddressObject.state} ${
      shippingAddressObject.zip
    }, ${shippingAddressObject.country}`;

    const customerEmail =
      session.customer_details?.email ||
      (existingOrder as any).customerEmail ||
      process.env.EMAIL_USER;

    const amountTotal = (session.amount_total || 0) / 100;
    const stripeSessionId = session.id;

    // 🔢 Order number
    let orderNumber = (existingOrder as any).orderNumber as number | undefined;
    if (!orderNumber) {
      try {
        const counters = db.collection("counters");
        // ✅ Explicitly use ObjectId to satisfy TypeScript
const result = await counters.findOneAndUpdate(
  { _id: new ObjectId("orderNumber") as any },
  { $inc: { sequence_value: 1 } },
  {
    returnDocument: "after",
    upsert: true,
    projection: { sequence_value: 1 },
  }
);

        orderNumber = result.value?.sequence_value || 100;
      } catch {
        orderNumber = Date.now();
      }
    }

    await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          orderNumber,
          customerName,
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

    // 📧 Send confirmation email
    try {
      const itemRows = items
        .map((item: any) => {
          const unit =
            item.unitPrice ??
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
              <td style="padding:8px;border:1px solid #ddd;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="${item.image || ""}" alt="${item.name || "Item"}"
                       style="width:50px;height:50px;object-fit:cover;border-radius:4px;" />
                  <div>
                    <div>${item.name || "Item"}</div>
                    ${sizeBadge}
                  </div>
                </div>
              </td>
              <td style="padding:8px;border:1px solid #ddd;">x${item.quantity || 1}</td>
              <td style="padding:8px;border:1px solid #ddd;">$${(
                unit * (item.quantity || 1)
              ).toFixed(2)}</td>
            </tr>`;
        })
        .join("");

      const html = `
        <h2>Thank You for Your Order, ${customerName}!</h2>
        <p>Your <strong>Order #${orderNumber}</strong> has been received.</p>
        <p><strong>Shipping to:</strong><br>${shippingAddressString}</p>
        <table style="width:100%;border-collapse:collapse;"><tbody>${itemRows}</tbody></table>
        <p><strong>Total:</strong> $${amountTotal.toFixed(2)}</p>
      `;

      const fromEmail = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;
      const fulfillmentEnv = process.env.ORDER_NOTIFICATION_EMAILS;
      const fulfillmentRecipients =
        fulfillmentEnv
          ?.split(/[,\n;]/)
          .map((email) => email.trim())
          .filter(Boolean) || [];

      if (!fulfillmentEnv) {
        console.warn(
          "⚠️ ORDER_NOTIFICATION_EMAILS environment variable is not set."
        );
      } else if (fulfillmentRecipients.length === 0) {
        console.warn(
          "⚠️ ORDER_NOTIFICATION_EMAILS did not contain any valid recipients."
        );
      }

      if (fromEmail && pass) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: fromEmail, pass },
        });

        if (customerEmail) {
          await transporter.sendMail({
            from: `"Classy Diamonds" <${fromEmail}>`,
            to: customerEmail,
            subject: `💎 Order Receipt – #${orderNumber}`,
            html,
          });

          console.log("📧 Receipt sent to:", customerEmail);
        } else {
          console.warn("⚠️ Missing customer email address.");
        }

        if (fulfillmentRecipients.length > 0) {
          const fulfillmentHtml = `
            <h2>New Order #${orderNumber}</h2>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Customer Email:</strong> ${customerEmail || "N/A"}</p>
            <p><strong>Customer Phone:</strong> ${
              session.customer_details?.phone || "N/A"
            }</p>
            <p><strong>Shipping Address:</strong><br>${shippingAddressString}</p>
            <p><strong>Total:</strong> $${amountTotal.toFixed(2)}</p>
            <h3>Items</h3>
            <table style="width:100%;border-collapse:collapse;"><tbody>${itemRows}</tbody></table>
          `;

          await transporter.sendMail({
            from: `"Classy Diamonds" <${fromEmail}>`,
            to: fulfillmentRecipients,
            subject: `New Order #${orderNumber}`,
            html: fulfillmentHtml,
          });

          console.log(
            "📦 Fulfillment notification sent to:",
            fulfillmentRecipients.join(", ")
          );
        }
      } else {
        console.warn("⚠️ Missing EMAIL_USER and/or EMAIL_PASS for email delivery.");
      }
    } catch (emailErr) {
      console.error("❌ Email error:", emailErr);
    }
  }

  return res.status(200).json({ received: true });
}
