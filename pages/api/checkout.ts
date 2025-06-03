// 🚀 pages/api/checkout.ts – Stripe Checkout Session (fixed to use street1/street2)

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 🚫 Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 🔍 Extract cart items and customer info (matching Cart page)
    const { items, name, email, address, notes, paymentMethod } = req.body;

    // 🛑 Validate that items is an array
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items data" });
    }

    // 📦 Build Stripe line_items array
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

    // 📬 Build a one-line address string for convenience
    const addressString = `${address.street1 || ""}${
      address.street2 ? `, ${address.street2}` : ""
    }, ${address.city || ""}, ${address.state || ""} ${address.zip || ""}, ${
      address.country || ""
    }`;

    // 🔑 Create the Stripe Checkout Session, pushing the correct metadata keys
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cart`,
      metadata: {
        customer_name: name || "",
        customer_email: email || "",
        customer_phone: (req.body.phone as string) || "",
        // ─── Use street1 / street2 here ─────────────────────────────────────
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
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe Checkout Error:", error.message);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
}
