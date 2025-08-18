// 📂 pages/api/admin/refund.ts – Full/partial refunds by _id or stripeSessionId (admin-only, idempotent, cents-safe)
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import Stripe from "stripe";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

type RefundBody = {
  orderId?: string; // Mongo _id (string)
  sessionId?: string; // Stripe session id (string)
  amount?: number; // cents; omit for full refund
  reason?: "requested_by_customer" | "duplicate" | "fraudulent" | "general";
  note?: string;
};

function isValidObjectId(s?: string) {
  return !!s && /^[0-9a-fA-F]{24}$/.test(s);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // 🔐 Admin-only
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !(session.user as any)?.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const {
      orderId,
      sessionId,
      amount,
      reason = "requested_by_customer",
      note,
    } = req.body as RefundBody;

    if (!orderId && !sessionId)
      return res.status(400).json({ error: "Provide orderId or sessionId" });

    const db = (await clientPromise).db();
    const Orders = db.collection("orders");

    // ✅ Find by _id when it looks like ObjectId; else by stripeSessionId
    let query: any = null;
    if (isValidObjectId(orderId)) {
      query = { _id: new ObjectId(orderId as string) };
    } else if (sessionId) {
      query = { stripeSessionId: String(sessionId) };
    } else {
      return res
        .status(400)
        .json({ error: "Invalid orderId; missing sessionId fallback" });
    }

    const order = await Orders.findOne(query);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const stripeSessionId: string | undefined =
      order.stripeSessionId || sessionId;
    if (!stripeSessionId)
      return res.status(400).json({ error: "Order missing stripeSessionId" });

    // 🧮 Cents math: compute remaining refundable based on our own totals
    const orderTotalCents =
      Math.round(
        (order.amount || order.saleTotal || order.originalTotal || 0) * 100
      ) || 0;
    const alreadyRefundedCents = Number(order.refundedTotal || 0);
    const remainingCents = Math.max(0, orderTotalCents - alreadyRefundedCents);
    if (remainingCents <= 0) {
      return res.status(400).json({ error: "Nothing left to refund" });
    }

    // 💳 Retrieve PI via Checkout Session
    const sessionObj = await stripe.checkout.sessions.retrieve(
      stripeSessionId,
      {
        expand: ["payment_intent"],
      }
    );
    const pi = sessionObj.payment_intent as Stripe.PaymentIntent | null;
    if (!pi || typeof pi === "string")
      return res.status(400).json({ error: "PaymentIntent not found" });

    // 🧯 Amount to refund: specified (validated) or full remaining
    let requestedAmount =
      typeof amount === "number" && Number.isFinite(amount)
        ? Math.round(amount)
        : undefined;
    if (requestedAmount !== undefined && requestedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be > 0 cents" });
    }
    const amountToRefund =
      requestedAmount === undefined
        ? remainingCents
        : Math.min(requestedAmount, remainingCents);

    // 🔁 Stripe idempotency to avoid double-refunds (same PI + amount + order)
    const idempotencyKey = [
      "refund",
      pi.id,
      String(order._id),
      amountToRefund,
      reason,
    ].join(":");

    // Stripe only accepts these reasons; map "general" -> undefined
    const stripeReason:
      | "duplicate"
      | "fraudulent"
      | "requested_by_customer"
      | undefined = reason === "general" ? undefined : reason;

    // 🧾 Create refund
    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: pi.id,
        amount: amountToRefund, // cents
        reason: stripeReason,
        metadata: {
          orderId: String(order._id),
          adminEmail: String((session.user as any)?.email || ""),
          note: note || "",
        },
      },
      { idempotencyKey }
    );

    const effectiveAmount = Number(stripeRefund.amount || amountToRefund);

    // 🗃️ Build refund entry
    const refundEntry = {
      refundId: stripeRefund.id,
      amount: effectiveAmount, // cents
      reason,
      note: note || "",
      adminEmail: String((session.user as any)?.email || ""),
      createdAt: new Date().toISOString(),
      provider: "stripe" as const,
      status: stripeRefund.status,
    };

    const newRefundedTotal = alreadyRefundedCents + effectiveAmount;
    const newStatus =
      newRefundedTotal >= orderTotalCents ? "refunded" : "partially_refunded";

    // 💾 Persist (push entry, set totals/status)
    await Orders.updateOne(
      { _id: order._id },
      {
        $push: { refunds: refundEntry },
        $set: {
          refundedTotal: newRefundedTotal, // cents
          status: newStatus,
          paymentStatus: newStatus, // keep both fields in sync for UIs
          refundedAt: new Date().toISOString(),
        },
      }
    );

    // 📝 Log to adminLogs
    await db.collection("adminLogs").insertOne({
      orderId: String(order._id),
      action: "refund",
      amount: effectiveAmount,
      note: note || "",
      timestamp: new Date().toISOString(),
      performedBy: String((session.user as any)?.email || ""),
      provider: "stripe",
      refundId: stripeRefund.id,
    });

    // ✉️ Optional: email customer (SMTP config optional)
    try {
      if (order.customerEmail && process.env.EMAIL_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT || "587"),
          secure: false,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        // Name safety (avoid literal "Stripe")
        const recipient = String(order.customerEmail);
        const safeName =
          typeof order.customerName === "string" &&
          order.customerName.trim().toLowerCase() !== "stripe"
            ? order.customerName
            : recipient.split("@")[0]?.replace(/\./g, " ") || "Customer";

        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: recipient,
          subject: `Your refund has been issued for Order #${
            order.orderNumber || String(order._id).slice(-6)
          }`,
          html: `
            <p>Hi ${safeName},</p>
            <p>We've processed your ${
              requestedAmount ? "partial" : "full"
            } refund of <strong>$${(effectiveAmount / 100).toFixed(
            2
          )}</strong>.</p>
            ${note ? `<p><strong>Note from us:</strong> ${note}</p>` : ""}
            <p>It can take 5–10 business days to appear on your statement.</p>
            <p>Thanks,<br/>${
              process.env.BUSINESS_NAME || "Customer Support"
            }</p>
          `,
        });
      }
    } catch (e) {
      await db.collection("adminLogs").insertOne({
        orderId: String(order._id),
        action: "refund_email_failed",
        error: (e as Error).message,
        timestamp: new Date().toISOString(),
        performedBy: String((session.user as any)?.email || ""),
      });
    }

    return res.status(200).json({
      ok: true,
      refund: refundEntry,
      status: newStatus,
      refundedTotal: newRefundedTotal,
      remainingAfter: Math.max(0, orderTotalCents - newRefundedTotal),
    });
  } catch (err: any) {
    console.error("❌ Refund error:", err);
    // Stripe surfaces human-readable message as err.message
    return res.status(500).json({ error: err.message || "Refund failed" });
  }
}
