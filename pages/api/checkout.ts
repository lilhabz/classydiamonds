// 🚀 pages/api/checkout.ts – Stripe Checkout Session (UPDATED for session_id in success_url + TS version fix) 🎯

// (Full file – we only removed the explicit `apiVersion` string to satisfy TypeScript’s expected version.
// Everything else remains as before, including the new `success_url` logic.)

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

// 🛠️ Initialize Stripe with your secret key
// Removed the explicit apiVersion parameter so TypeScript doesn’t complain about version mismatch.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 🚫 Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 🔍 Extract cart items and customer info from request body
    const { items, name, email, address } = req.body;

    // 🛑 Validate that items is an array
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items data" });
    }

    // 📦 Build Stripe line_items array
    const line_items = items
      .filter((item) => item && item.name && item.price && item.quantity)
      .map((item) => {
        // 🏷️ Construct product_data
        const product_data: any = { name: item.name };
        if (item.image && item.image.startsWith("http")) {
          product_data.images = [item.image];
        }

        return {
          price_data: {
            currency: "usd",
            product_data,
            unit_amount: item.price * 100, // convert dollars to cents
          },
          quantity: item.quantity,
        };
      });

    // 📬 Flatten address into a single string for metadata
    const addressString = `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;

    // 🔑 Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      // ‼️ success_url now includes Stripe’s placeholder {CHECKOUT_SESSION_ID}
      // Stripe will replace this with the real session ID upon redirect.
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cart`,
      metadata: {
        customer_name: name,
        customer_email: email,
        customer_address: addressString,
        address_street: address.street,
        address_city: address.city,
        address_state: address.state,
        address_zip: address.zip,
        address_country: address.country,
        items: JSON.stringify(items),
      },
    });

    // 🔁 Return the session URL (the front-end should redirect to this)
    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe Checkout Error:", error.message);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
}
