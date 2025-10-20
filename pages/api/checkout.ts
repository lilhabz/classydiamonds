// ✅ Fixed: pages/api/checkout.ts
// - Forces Node runtime so Vercel doesn’t try to deploy it as an Edge function
// - Keeps all your current logic and MongoDB order flow fully intact
// - No dotenv at runtime (Vercel injects env automatically)

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import clientPromise from "@/lib/mongodb";

// 🚀 Force Node runtime (this is what prevents the "Deploying outputs" crash)
export const runtime = "nodejs";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment.");
}

const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: "2025-08-27.basil" as any, // 👈 cast to any to satisfy TypeScript
});


type IncomingItem = {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  quantity: number;
  size?: string | null;
  price?: number;
  discountedPrice?: number;
  salePrice?: number;
  originalPrice?: number;
};

type IncomingAddress =
  | {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    }
  | {
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
    const body = req.body || {};
    const items: IncomingItem[] = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return res.status(400).json({ error: "No items to checkout." });
    }

    const customerBlock = body.customer || {};
    const name: string | undefined = customerBlock.name ?? body.name;
    const email: string | undefined = customerBlock.email ?? body.email;
    const phone: string | undefined = customerBlock.phone ?? body.phone;
    const addr: IncomingAddress = customerBlock.address ?? body.address ?? {};

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

    const origin =
      (req.headers["x-forwarded-proto"] && req.headers["x-forwarded-host"]
        ? `${req.headers["x-forwarded-proto"]}://${req.headers["x-forwarded-host"]}`
        : (req.headers.origin as string)) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const normalized = items.map((i) => {
      const unit =
        i.discountedPrice ?? i.salePrice ?? i.price ?? i.originalPrice;
      if (unit == null) throw new Error(`Missing price for item "${i.name}".`);
      return { ...i, unit_amount_cents: Math.round(unit * 100) };
    });

    const createAccount: boolean = !!body.createAccount;
    const password: string | undefined =
      typeof body.password === "string" ? body.password : undefined;
    const marketingOptIn: boolean = !!body.marketingOptIn;

    // 🔐 optional account creation flow
    if (createAccount) {
      if (!email || !password) {
        return res.status(400).json({
          error: "Account creation requested but missing email/password.",
        });
      }

      try {
        const regRes = await fetch(`${origin}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name || "",
            email,
            password,
            phone: phone || "",
            address,
            marketingOptIn,
          }),
        });
        const regJson = await regRes.json().catch(() => null);

        if (regRes.status === 409 || regJson?.alreadyExists) {
          return res.status(409).json({ error: "Account already exists" });
        }

        if (!regRes.ok || regJson?.ok === false) {
          return res.status(400).json({
            error: regJson?.error || "Account creation failed",
          });
        }
      } catch {
        return res.status(400).json({
          error: "Could not create account at this time. Please try again.",
        });
      }
    }

    // 🗄️ store pre-checkout order
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
      stripeSessionId: undefined,
      createdAt: new Date(),
      shipped: false,
      archived: false,
      isGuest: !createAccount,
      createAccountRequested: createAccount || undefined,
      marketingOptIn: marketingOptIn || undefined,
    };

    const { insertedId } = await orders.insertOne(orderDoc);

    if (marketingOptIn && email) {
      try {
        await db.collection("marketing_list").updateOne(
          { email: email.toLowerCase() },
          {
            $set: {
              email: email.toLowerCase(),
              name: name || "",
              source: "checkout",
              lastOptInAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      } catch (e) {
        console.error("Marketing opt-in failed", e);
      }
    }

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
      metadata: { orderId: insertedId.toString() },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

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
