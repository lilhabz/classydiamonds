// 📦 pages/api/checkout.ts – Guest-friendly Stripe Checkout (size + slug metadata, flexible payload)

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import clientPromise from "@/lib/mongodb";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment.");
}

// Tip: keep your project’s pinned Stripe API version here
const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: "2025-04-30.basil",
});

type IncomingItem = {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  quantity: number;
  size?: string | null;

  // any of these can show up depending on the caller
  price?: number; // may already be SALE price (new cart.tsx)
  discountedPrice?: number; // old shape
  salePrice?: number; // sometimes present
  originalPrice?: number; // sometimes present
};

type IncomingAddress =
  | {
      // new cart.tsx shape
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    }
  | {
      // older shape
      street1?: string;
      street2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ url?: string; error?: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Accept BOTH payload styles:
    //  - new: { items, customer: { name, email, phone, address: { line1, ... } }, notes, paymentMethod }
    //  - old: { items, name, email, phone, address: { street1, ... }, notes, paymentMethod }
    const body = req.body || {};

    const items: IncomingItem[] = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return res.status(400).json({ error: "No items to checkout." });
    }

    // Normalize customer fields
    const customerBlock = body.customer || {};
    const name: string | undefined =
      customerBlock.name ?? body.name ?? undefined;
    const email: string | undefined =
      customerBlock.email ?? body.email ?? undefined;
    const phone: string | undefined =
      customerBlock.phone ?? body.phone ?? undefined;
    const addr: IncomingAddress = customerBlock.address ?? body.address ?? {};

    // Normalize address to a single shape
    const address = {
      line1: (addr as any).line1 ?? (addr as any).street1 ?? "",
      line2: (addr as any).line2 ?? (addr as any).street2 ?? "",
      city: (addr as any).city ?? "",
      state: (addr as any).state ?? "",
      postal_code: (addr as any).postal_code ?? (addr as any).zip ?? "",
      country: (addr as any).country ?? "US",
    };

    const notes: string = body.notes ?? "";
    const paymentMethod: string = body.paymentMethod ?? "stripe";

    // Compute each line item's unit amount (prefer sale/discounted if provided)
    // Priority: discountedPrice → salePrice → price → originalPrice
    const normalized = items.map((i) => {
      const unit =
        i.discountedPrice ?? i.salePrice ?? i.price ?? i.originalPrice;

      if (unit == null) {
        throw new Error(`Missing price for item "${i.name}" (${i.id}).`);
      }

      return {
        ...i,
        unit_amount_cents: Math.round(unit * 100),
      };
    });

    // Create a pre-checkout order stub in MongoDB (guest-safe)
    const client = await clientPromise;
    const db = client.db();
    const orders = db.collection("orders");

    const originalTotal = normalized.reduce(
      (sum, i) =>
        sum + (i.originalPrice ?? i.price ?? i.salePrice ?? 0) * i.quantity,
      0
    );
    const saleTotal = normalized.reduce(
      (sum, i) => sum + (i.unit_amount_cents / 100) * i.quantity,
      0
    );

    const orderDoc = {
      orderNumber: undefined as string | undefined, // (set in webhook if you generate one)
      customerName: name ?? "[Guest]",
      customerEmail: email ?? "",
      customerPhone: phone ?? "",
      address,
      notes,
      paymentMethod,
      items: normalized.map((i) => ({
        id: i.id,
        slug: i.slug ?? "",
        name: i.name,
        image: i.image ?? "",
        quantity: i.quantity,
        size: i.size ?? null,
        unitPrice: i.unit_amount_cents / 100,
      })),
      originalTotal,
      saleTotal,
      stripeSessionId: undefined as string | undefined,
      createdAt: new Date(),
      shipped: false,
      archived: false,
      isGuest: true,
    };

    const { insertedId } = await orders.insertOne(orderDoc);

    // Build Stripe line_items (with metadata: id, slug, size)
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      normalized.map((i) => ({
        price_data: {
          currency: "usd",
          unit_amount: i.unit_amount_cents,
          product_data: {
            name: i.size ? `${i.name} (Size ${i.size})` : i.name,
            images: i.image && i.image.startsWith("http") ? [i.image] : [],
            description: i.size ? `Ring size: ${i.size}` : undefined,
            metadata: {
              id: i.id,
              slug: i.slug ?? "",
              size: i.size ?? "",
            },
          },
        },
        quantity: i.quantity,
      }));

    // Create Stripe Checkout Session
    const origin =
      req.headers["x-forwarded-proto"] && req.headers["x-forwarded-host"]
        ? `${req.headers["x-forwarded-proto"]}://${req.headers["x-forwarded-host"]}`
        : (req.headers.origin as string) ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      phone_number_collection: { enabled: true },
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
      metadata: {
        orderId: insertedId.toString(),
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    // Keep Mongo in sync with the new session id
    await orders.updateOne(
      { _id: insertedId },
      { $set: { stripeSessionId: session.id } }
    );

    return res.status(200).json({ url: session.url ?? undefined });
  } catch (err: any) {
    console.error("❌ Checkout Error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Checkout failed" });
  }
}
