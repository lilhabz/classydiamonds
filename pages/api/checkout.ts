// ✅ Fixed: Stripe Checkout with correct discounted pricing and shipping collection

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
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
    } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items data" });
    }

    const line_items = items
      .filter((item: any) => item && item.name && item.quantity)
      .map((item: any) => {
        const price = item.discountedPrice ?? item.price;
        const product_data: any = { name: item.name };
        if (item.image?.startsWith("http")) {
          product_data.images = [item.image];
        }
        return {
          price_data: {
            currency: "usd",
            product_data,
            unit_amount: Math.round(price * 100),
          },
          quantity: item.quantity,
        };
      });

    const addressString = `${address.street1 || ""}${
      address.street2 ? `, ${address.street2}` : ""
    }, ${address.city || ""}, ${address.state || ""} ${address.zip || ""}, ${
      address.country || ""
    }`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // Enables Apple/Google Pay
      mode: "payment",
      customer_email: email, // ✅ Prefills customer email
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: 0,
              currency: "usd",
            },
            display_name: "Free Shipping",
          },
        },
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cart`,
      line_items,
      metadata: {
        customer_name: name || "",
        customer_email: email || "",
        customer_phone: phone || "",
        address_street1: address.street1 || "",
        address_street2: address.street2 || "",
        address_city: address.city || "",
        address_state: address.state || "",
        address_zip: address.zip || "",
        address_country: address.country || "",
        customer_address: addressString,
        notes: notes || "",
        payment_method: paymentMethod || "stripe",
        items: JSON.stringify(
          items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.discountedPrice ?? item.price,
            image: item.image || "",
          }))
        ),
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
