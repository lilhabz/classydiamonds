// pages/api/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
      address = {},
      notes,
      paymentMethod,
      phone,
    } = req.body as {
      items: Array<{
        id: string;
        name: string;
        price: number; // original price
        discountedPrice?: number; // sale price if discounted
        image: string;
        quantity: number;
      }>;
      name?: string;
      email?: string;
      address?: {
        street1?: string;
        street2?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
      };
      notes?: string;
      paymentMethod?: string;
      phone?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid items data" });
    }

    // 1️⃣ Compute totals
    const originalTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const saleTotal = items.reduce(
      (sum, item) => sum + (item.discountedPrice ?? item.price) * item.quantity,
      0
    );
    const discountAmount = Math.round((originalTotal - saleTotal) * 100); // in cents

    // 2️⃣ Build line items at the ORIGINAL price
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      items.map((item) => {
        const productData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData =
          { name: item.name };
        if (item.image?.startsWith("http")) {
          productData.images = [item.image];
        }
        return {
          price_data: {
            currency: "usd",
            product_data: productData,
            unit_amount: Math.round(item.price * 100), // original price
          },
          quantity: item.quantity,
        };
      });

    // 3️⃣ Create a one‑time coupon if there is a discount
    let couponId: string | undefined;
    if (discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: discountAmount,
        currency: "usd",
        duration: "once",
      });
      couponId = coupon.id;
    }

    // 4️⃣ Format shipping address string
    const addressString = `${address.street1 || ""}${
      address.street2 ? `, ${address.street2}` : ""
    }, ${address.city || ""}, ${address.state || ""} ${address.zip || ""}, ${
      address.country || ""
    }`;

    // 5️⃣ Create the Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
            display_name: "Free Shipping",
          },
        },
      ],
      line_items,
      discounts: couponId ? [{ coupon: couponId }] : [],
      metadata: {
        customer_name: name || "",
        customer_email: email || "",
        customer_phone: phone || "",
        customer_address: addressString,
        notes: notes || "",
        payment_method: paymentMethod || "stripe",

        // capture totals in cents
        original_price_total: Math.round(originalTotal * 100).toString(),
        sale_price_total: Math.round(saleTotal * 100).toString(),

        // capture per-item pricing
        items: JSON.stringify(
          items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            originalPrice: item.price,
            salePrice: item.discountedPrice ?? item.price,
            image: item.image,
          }))
        ),
      },
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cart`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe Checkout Error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal server error" });
  }
}
