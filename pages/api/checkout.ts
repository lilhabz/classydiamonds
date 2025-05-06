// 📤 pages/api/checkout.ts – Stripe Checkout Session

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items, name, email, address } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items data" });
    }

    const line_items = items
      .filter((item) => item && item.name && item.price && item.quantity)
      .map((item) => {
        const product_data: any = { name: item.name };
        if (item.image && item.image.startsWith("http")) {
          product_data.images = [item.image];
        }

        return {
          price_data: {
            currency: "usd",
            product_data,
            unit_amount: item.price * 100,
          },
          quantity: item.quantity,
        };
      });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: `${req.headers.origin}/success`,
      cancel_url: `${req.headers.origin}/cart`,
      metadata: {
        customer_name: name,
        customer_email: email,
        customer_address: address,
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
