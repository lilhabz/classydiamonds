// 📦 pages/api/webhook.ts – Stripe + Account Address Fallback (Fixed for Images in Orders) 💎

import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
    const rawItems: Array<{
      id: string;
      name?: string;
      quantity?: number | string;
      originalPrice?: number | string | null;
      salePrice?: number | string | null;
      discountedPrice?: number | string | null;
      image?: string;
    }> = JSON.parse((metadata.items as string) || "[]");

    // 🔍 Load products from DB to ensure we have imageUrl + correct prices
    const productIds = rawItems.map((i) => i.id);
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const products = await db
      .collection("products")
      .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) } })
      .toArray();
    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

    // 🛠 Map final order items
    const items = rawItems.map((i) => {
      const product: any = productMap.get(i.id) || {};

      const original =
        i.originalPrice != null
          ? Number(i.originalPrice)
          : product.price != null
          ? Number(product.price)
          : 0;

      const sale =
        i.salePrice != null
          ? Number(i.salePrice)
          : i.discountedPrice != null
          ? Number(i.discountedPrice)
          : product.salePrice != null
          ? Number(product.salePrice)
          : undefined;

      return {
        name: i.name || product.name || "",
        // 🔑 Always store the same Cloudinary URL used in the product page
        image:
          i.image || // From checkout metadata
          product.imageUrl || // From DB current field
          product.image || // Legacy fallback
          "",
        quantity: Number(i.quantity) || 1,
        originalPrice: original,
        ...(sale !== undefined && { salePrice: sale, discountedPrice: sale }),
      };
    });

    // ✅ Address preference: Stripe shipping_details → customer_details → metadata
    const stripeAddr =
      session.shipping_details?.address ||
      session.customer_details?.address ||
      null;

    const stripeName =
      metadata.customer_name ||
      session.shipping_details?.name ||
      session.customer_details?.name ||
      "Customer";

    const shippingAddressObject = {
      street: stripeAddr?.line1 || metadata.address_street1 || "",
      line2: stripeAddr?.line2 || metadata.address_street2 || "",
      city: stripeAddr?.city || metadata.address_city || "",
      state: stripeAddr?.state || metadata.address_state || "",
      zip: stripeAddr?.postal_code || metadata.address_zip || "",
      country: stripeAddr?.country || metadata.address_country || "",
    };

    const shippingAddressString = `${shippingAddressObject.street}${
      shippingAddressObject.line2 ? `, ${shippingAddressObject.line2}` : ""
    }, ${shippingAddressObject.city}, ${shippingAddressObject.state} ${
      shippingAddressObject.zip
    }, ${shippingAddressObject.country}`;

    const customerEmail =
      session.customer_details?.email ||
      metadata.customer_email ||
      process.env.EMAIL_USER;

    // 📦 Log address source for debug
    if (session.shipping_details?.address) {
      console.log("✅ Address Source: Stripe shipping_details");
    } else if (session.customer_details?.address) {
      console.log("✅ Address Source: Stripe customer_details");
    } else {
      console.log("⚠️ Address Source: Account metadata fallback");
    }
    console.log("📦 Shipping Address Saved:", shippingAddressObject);

    const amountTotal = (session.amount_total || 0) / 100;
    const stripeSessionId = session.id;

    // 🔢 Generate order number
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

    // 💾 Save order if not already saved
    const existing = await ordersCollection.findOne({ stripeSessionId });
    if (!existing) {
      await ordersCollection.insertOne({
        orderNumber,
        customerName: stripeName,
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
          const price =
            item.salePrice ??
            item.discountedPrice ??
            item.originalPrice ??
            item.price ??
            0;
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
