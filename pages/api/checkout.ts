// 🚀 pages/api/checkout.ts – Polished Stripe Checkout with Wallet Support

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

// 🔐 Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 🔒 Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { items, name, email, address = {}, notes, paymentMethod } = req.body;

    // ✅ Validate items
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items data" });
    }

    // 🛍️ Format cart items for Stripe
    const line_items = items
      .filter((item: any) => item && item.name && item.price && item.quantity)
      .map((item: any) => {
        const product_data: any = { name: item.name };
        if (item.image && item.image.startsWith("http")) {
          product_data.images = [item.image];
        }
        return {
          price_data: {
            currency: "usd",
            product_data,
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        };
      });

    // 📬 Format full address
    const addressString = `${address.street1 || ""}${
      address.street2 ? `, ${address.street2}` : ""
    }, ${address.city || ""}, ${address.state || ""} ${address.zip || ""}, ${
      address.country || ""
    }`;

    // 🧾 Create the Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // Enables Apple Pay + Google Pay automatically
      mode: "payment",
      line_items,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cart`,
      metadata: {
        customer_name: name || "",
        customer_email: email || "",
        customer_phone: (req.body.phone as string) || "",
        address_street1: address.street1 || "",
        address_street2: address.street2 || "",
        address_city: address.city || "",
        address_state: address.state || "",
        address_zip: address.zip || "",
        address_country: address.country || "",
        customer_address: addressString,
        notes: notes || "",
        payment_method: paymentMethod || "stripe",
        items: JSON.stringify(items),
      },
      // 🖼️ Optional visual branding (set in Stripe dashboard)
      // customer_email: email,  // Optional: prefill email
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe Checkout Error:", error.message);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
}
