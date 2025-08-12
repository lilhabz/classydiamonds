// 📦 pages/api/checkout.ts – Stripe Checkout with Order DB Reference 💎 (size-aware)

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
    return res.status(405).json({ error: "Method Not Allowed" });
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
    } = req.body as {
      items: Array<{
        id: string;
        name: string;
        price: number;
        discountedPrice?: number;
        image?: string;
        quantity: number;
        size?: string; // 🆕 may be present
      }>;
      name?: string;
      email?: string;
      address?: any;
      notes?: string;
      paymentMethod?: string;
      phone?: string;
    };

    // 🛑 Validate cart
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid items data" });
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

    // 🎟️ Coupon if needed (cart-wide discount)
    let couponId: string | undefined;
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

    // 🗄 Save order to MongoDB before Stripe checkout (includes size in items)
    const client = await clientPromise;
    const db = client.db();
    const ordersCollection = db.collection("orders");

    const orderDoc = {
      orderNumber: undefined, // set in webhook
      customerName: name || "[No Name]",
      customerEmail: email || "[No Email]",
      customerPhone: phone || "[No Phone]",
      address: { street1, street2, city, state, zip, country },
      notes: notes || "",
      paymentMethod: paymentMethod || "stripe",
      items, // keep full items incl. size
      originalTotal,
      saleTotal,
      stripeSessionId: undefined, // updated in webhook
      createdAt: new Date(),
      shipped: false,
      archived: false,
    };

    const orderResult = await ordersCollection.insertOne(orderDoc);

    // 🚀 Stripe Session (lightweight metadata; add size to product_data)
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
      line_items: items.map((i) => {
        const nameWithSize = i.size ? `${i.name} (Size ${i.size})` : i.name;
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: nameWithSize,
              images: i.image?.startsWith("http") ? [i.image] : [],
              // 🆕 Make size visible in Stripe product metadata too
              metadata: i.size ? { size: String(i.size) } : undefined,
              // optional: also surface in description
              description: i.size ? `Ring size: ${i.size}` : undefined,
            },
            // Keep unit_amount = original price; discount handled via coupon above
            unit_amount: Math.round(i.price * 100),
          },
          quantity: i.quantity,
        };
      }),
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

    return res.status(200).json({ url: session.url ?? undefined });
  } catch (err: any) {
    console.error("❌ Checkout Error:", err.message);
    return res.status(500).json({ error: err.message || "Checkout failed" });
  }
}
