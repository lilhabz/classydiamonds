// 📦 pages/api/checkout.ts – Stripe Checkout with Stripe + Account Address Fallback 💎 (Updated)

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ url?: string; error?: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const {
      items,
      name,
      email,
      address = {}, // from frontend/session
      notes,
      paymentMethod,
      phone,
    } = req.body;

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

    console.log("🛒 Cart:", items);
    console.log("💰 Totals:", { originalTotal, saleTotal, discountAmount });

    // 🎟️ Coupon if needed
    let couponId;
    if (discountAmount > 0) {
      try {
        const coupon = await stripe.coupons.create({
          amount_off: discountAmount,
          currency: "usd",
          duration: "once",
        });
        couponId = coupon.id;
        console.log("🎟️ Coupon created:", couponId);
      } catch (couponErr: any) {
        console.error("❌ Coupon error:", couponErr.message);
        return res.status(500).json({ error: couponErr.message });
      }
    }

    // 📍 Address Fallback (Account Edit Page)
    const street1 = address.street1 || "[No Street]";
    const street2 = address.street2 || "";
    const city = address.city || "[No City]";
    const state = address.state || "[No State]";
    const zip = address.zip || "[No Zip]";
    const country = address.country || "[No Country]";

    console.log("📍 Account Address Fallback in Checkout:", {
      street1,
      street2,
      city,
      state,
      zip,
      country,
    });

    // 🚀 Stripe Session
    let session;
    try {
      session = await stripe.checkout.sessions.create({
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
          customer_name: name || "[No Name]",
          customer_email: email || "[No Email]",
          customer_phone: phone || "[No Phone]",
          // 🏷 Address Fallback
          address_street1: street1,
          address_street2: street2,
          address_city: city,
          address_state: state,
          address_zip: zip,
          address_country: country,
          notes: notes || "",
          payment_method: paymentMethod || "stripe",
          original_price_total: Math.round(originalTotal * 100).toString(),
          sale_price_total: Math.round(saleTotal * 100).toString(),
          items: JSON.stringify(
            items.map((i) => ({
              id: i.id,
              name: i.name,
              quantity: i.quantity,
              originalPrice: i.price,
              salePrice: i.discountedPrice ?? i.price,
              image: i.image,
            }))
          ),
        },
        success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/cart`,
      });
    } catch (stripeErr: any) {
      console.error("❌ Stripe Session Error:", stripeErr.message);
      return res.status(500).json({ error: stripeErr.message });
    }

    if (!session?.url) {
      console.error("❌ Stripe did not return a URL");
      return res.status(500).json({ error: "Stripe session missing URL" });
    }

    console.log("✅ Stripe session created:", session.id);
    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("❌ General Checkout Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
