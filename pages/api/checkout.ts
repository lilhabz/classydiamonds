// 📦 pages/api/checkout.ts – Stripe Checkout with Order DB Reference 💎 (Fixed Metadata Limit + Type Fix)

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import clientPromise from "@/lib/mongodb"; // ✅ MongoDB connection

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ url?: string; error?: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" }); // ✅ Matches type
  }

  try {
    const {
      items,
      name,
      email,
      address = {},
      notes,
      paymentMethod,
      phone,
    } = req.body;

    // 🛑 Validate cart
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid items data" }); // ✅ Matches type
    }

    // 🧮 Totals
    const originalTotal = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const saleTotal = items.reduce(
      (sum, i) => sum + (i.discountedPrice ?? i.price) * i.quantity,
      0
    );
    const discountAmount = Math.round((originalTotal - saleTotal) * 100);

    // 🎟️ Coupon if needed
    let couponId;
    if (discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: discountAmount,
        currency: "usd",
        duration: "once",
      });
      couponId = coupon.id;
    }

    // 📍 Address fallback
    const street1 = address.street1 || "[No Street]";
    const street2 = address.street2 || "";
    const city = address.city || "[No City]";
    const state = address.state || "[No State]";
    const zip = address.zip || "[No Zip]";
    const country = address.country || "[No Country]";

    // 🗄 Save order to MongoDB before Stripe checkout
    const client = await clientPromise;
    const db = client.db();
    const ordersCollection = db.collection("orders");

    const orderDoc = {
      orderNumber: undefined, // Will be set in webhook
      customerName: name || "[No Name]",
      customerEmail: email || "[No Email]",
      customerPhone: phone || "[No Phone]",
      address: { street1, street2, city, state, zip, country },
      notes: notes || "",
      paymentMethod: paymentMethod || "stripe",
      items, // Full details safely stored in DB
      originalTotal,
      saleTotal,
      stripeSessionId: undefined, // Will be updated in webhook
      createdAt: new Date(),
      shipped: false,
      archived: false,
    };

    const orderResult = await ordersCollection.insertOne(orderDoc);

    // 🚀 Stripe Session (only lightweight metadata)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
            display_name: "Free Shipping",
          },
        },
      ],
      line_items: items.map((i) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: i.name,
            images: i.image?.startsWith("http") ? [i.image] : [],
          },
          unit_amount: Math.round(i.price * 100),
        },
        quantity: i.quantity,
      })),
      discounts: couponId ? [{ coupon: couponId }] : [],
      metadata: {
        orderId: orderResult.insertedId.toString(),
      },
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cart`,
    });

    // 🔄 Update order with Stripe Session ID (helps webhook)
    await ordersCollection.updateOne(
      { _id: orderResult.insertedId },
      { $set: { stripeSessionId: session.id } }
    );

    return res.status(200).json({ url: session.url ?? undefined }); // ✅ Type-safe
  } catch (err: any) {
    console.error("❌ Checkout Error:", err.message);
    return res.status(500).json({ error: err.message || "Checkout failed" }); // ✅ Matches type
  }
}
