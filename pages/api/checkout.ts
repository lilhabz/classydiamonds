// 📦 pages/api/checkout.ts – Fixed URL Return & Debug Logging
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
      address = {},
      notes,
      paymentMethod,
      phone,
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid items data" });
    }

    // 🛠 Calculate totals
    const originalTotal = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const saleTotal = items.reduce(
      (sum, i) => sum + (i.discountedPrice ?? i.price) * i.quantity,
      0
    );
    const discountAmount = Math.round((originalTotal - saleTotal) * 100);

    // 🛠 Build line items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      items.map((i) => {
        const productData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData =
          {
            name: i.name,
          };
        if (i.image?.startsWith("http")) {
          productData.images = [i.image];
        }
        return {
          price_data: {
            currency: "usd",
            product_data: productData,
            unit_amount: Math.round(i.price * 100),
          },
          quantity: i.quantity,
        };
      });

    // 🛠 Optional discount coupon
    let couponId: string | undefined;
    if (discountAmount > 0) {
      try {
        const coupon = await stripe.coupons.create({
          amount_off: discountAmount,
          currency: "usd",
          duration: "once",
        });
        couponId = coupon.id;
      } catch (couponError: any) {
        console.error("❌ Coupon creation failed:", couponError);
      }
    }

    // 🛠 Format address
    const addressString = `${address.street1 || ""}${
      address.street2 ? `, ${address.street2}` : ""
    }, ${address.city || ""}, ${address.state || ""} ${address.zip || ""}, ${
      address.country || ""
    }`;

    // 🛠 Create checkout session
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
      line_items,
      discounts: couponId ? [{ coupon: couponId }] : [],
      metadata: {
        customer_name: name || "",
        customer_email: email || "",
        customer_phone: phone || "",
        customer_address: addressString,
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

    if (!session?.url) {
      console.error("❌ Stripe returned no URL. Session:", session);
      return res
        .status(500)
        .json({ error: "Stripe did not return checkout URL" });
    }

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe Checkout Error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal server error" });
  }
}
