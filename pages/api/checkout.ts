// 📤 pages/api/checkout.ts – Stripe Checkout Session

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

// ✅ Stripe initialized without apiVersion for v18+
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

    const line_items = items.map((item: any) => {
      const hasImage =
        typeof item.image === "string" && item.image.trim() !== "";
      const imageUrl =
        hasImage && item.image.startsWith("http")
          ? item.image
          : hasImage
          ? `${req.headers.origin}${item.image.startsWith("/") ? "" : "/"}${
              item.image
            }`
          : undefined;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            ...(imageUrl ? { images: [imageUrl] } : {}), // ✅ Only include if valid
          },
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
