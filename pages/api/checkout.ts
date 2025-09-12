// 📦 pages/api/checkout.ts – Guest-friendly Stripe Checkout (size + slug metadata, flexible payload)
// + Optional account creation + marketing opt-in
// + ✅ Short-circuit on duplicate account (409) or registration failure (400)

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
    //  - new: { items, customer: { name, email, phone, address: { line1, ... } }, notes, paymentMethod, createAccount?, password?, marketingOptIn? }
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

    // 🧭 Determine origin (used below for /api/register + redirect URLs)
    const origin =
      (req.headers["x-forwarded-proto"] && req.headers["x-forwarded-host"]
        ? `${req.headers["x-forwarded-proto"]}://${req.headers["x-forwarded-host"]}`
        : (req.headers.origin as string)) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    // 🧮 Normalize prices for Stripe (prefer discount/sale if provided)
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

    // 🆕 Engagement flags from payload
    const createAccount: boolean = !!body.createAccount;
    const password: string | undefined =
      typeof body.password === "string" ? body.password : undefined;
    const marketingOptIn: boolean = !!body.marketingOptIn;

    // ───────────────────────────────────────────────────────────
    // 🔐 EARLY account-creation check (short-circuit on 409/400)
    // ───────────────────────────────────────────────────────────
    if (createAccount) {
      if (!email || !password) {
        // If caller asked to create an account but didn't send credentials, fail cleanly
        return res
          .status(400)
          .json({
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

        let regJson: any = null;
        try {
          regJson = await regRes.json();
        } catch {
          // ignore parse error (treat as non-ok below if needed)
        }

        // If register endpoint reports an existing account or explicitly sends 409 → stop with 409
        if (regRes.status === 409 || regJson?.alreadyExists === true) {
          return res.status(409).json({ error: "Account already exists" });
        }

        // Any other non-OK from register: stop with 400 (do not proceed to Stripe)
        if (!regRes.ok || regJson?.ok === false) {
          return res
            .status(400)
            .json({ error: regJson?.error || "Account creation failed" });
        }
      } catch (e) {
        // Network error contacting /api/register → safer to stop and let user retry
        return res
          .status(400)
          .json({
            error: "Could not create account at this time. Please try again.",
          });
      }
    }

    // ───────────────────────────────────────────────────────────
    // 🗄️ Create a pre-checkout order stub in MongoDB (guest-safe)
    // ───────────────────────────────────────────────────────────
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
      isGuest: !createAccount, // if they requested an account, this will flip later in webhook/fulfillment
      // 🆕 engagement flags stored on the order record for reference
      createAccountRequested: createAccount || undefined,
      marketingOptIn: marketingOptIn || undefined,
    };

    const { insertedId } = await orders.insertOne(orderDoc);

    // 🆕 Best-effort: if marketing opt-in, upsert email into a simple list
    if (marketingOptIn && email) {
      try {
        const list = db.collection("marketing_list");
        await list.updateOne(
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
        console.error("marketing opt-in upsert failed", e);
      }
    }

    // 🧾 Build Stripe line_items (with metadata: id, slug, size)
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

    // 🧾 Create Stripe Checkout Session
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
