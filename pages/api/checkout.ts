// 📤 pages/api/checkout.ts – Stripe Checkout Session

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

// ✅ Initialize without apiVersion to use the correct default for v18.1.0
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end("Method not allowed");
  }

  try {
    const items = req.body.items;

    // 🛡️ Build Stripe-compatible line_items array (no image key if invalid)
    const line_items = items.map((item: any) => {
      const hasValidImage = item.image && item.image.startsWith("http");

      const product_data: any = {
        name: item.name,
      };

      if (hasValidImage) {
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
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe Checkout Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
