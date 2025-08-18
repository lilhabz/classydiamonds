// 📂 pages/api/admin/refund.ts – Full/partial refunds by _id or stripeSessionId
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email)
    return res.status(401).json({ error: "Not authenticated" });

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

    // Find by _id OR stripeSessionId
    const query: any = orderId
      ? { _id: new ObjectId(orderId) }
      : { stripeSessionId: sessionId };
    const order = await Orders.findOne(query);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const stripeSessionId: string | undefined =
      order.stripeSessionId || sessionId;
    if (!stripeSessionId)
      return res.status(400).json({ error: "Order missing stripeSessionId" });

    // Get PaymentIntent from Checkout Session
    const sessionObj = await stripe.checkout.sessions.retrieve(
      stripeSessionId,
      { expand: ["payment_intent"] }
    );
    const pi = sessionObj.payment_intent as Stripe.PaymentIntent | null;
    if (!pi || typeof pi === "string")
      return res.status(400).json({ error: "PaymentIntent not found" });

    const maxAmount = pi.amount_received ?? 0;
    const refundAmount =
      typeof amount === "number" ? Math.min(amount, maxAmount) : undefined; // undefined = full

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: pi.id,
      amount: refundAmount,
      reason: reason === "general" ? undefined : (reason as any),
      metadata: {
        orderId: String(order._id),
        adminEmail: session.user.email,
        note: note || "",
      },
    });

    // Update order with refund entry
    const refundEntry = {
      refundId: refund.id,
      amount: refund.amount ?? maxAmount,
      reason,
      note: note || "",
      adminEmail: session.user.email,
      createdAt: new Date().toISOString(),
      provider: "stripe" as const,
      status: refund.status,
    };

    const refundedTotal =
      (order.refundedTotal || 0) + (refundEntry.amount || 0);
    const newStatus =
      refundedTotal >=
      (order.amount || order.saleTotal || order.originalTotal || 0)
        ? "refunded"
        : "partially_refunded";

    await Orders.updateOne(
      { _id: order._id },
      {
        $push: { refunds: refundEntry },
        $set: {
          refundedTotal,
          status: newStatus,
          refundedAt: new Date().toISOString(),
        },
      }
    );

    // Log to adminLogs
    const AdminLogs = db.collection("adminLogs");
    await AdminLogs.insertOne({
      orderId: String(order._id),
      action: "refund",
      amount: refundEntry.amount,
      note: note || "",
      timestamp: new Date().toISOString(),
      performedBy: session.user.email,
      provider: "stripe",
      refundId: refund.id,
    });

    // Optional: email the customer
    try {
      if (order.customerEmail && process.env.EMAIL_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT || "587"),
          secure: false,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: order.customerEmail,
          subject: `Your refund has been issued for Order #${
            order.orderNumber || String(order._id).slice(-6)
          }`,
          html: `
            <p>Hi ${order.customerName || "there"},</p>
            <p>We've processed your ${
              refundAmount ? "partial" : "full"
            } refund of <strong>$${((refundEntry.amount || 0) / 100).toFixed(
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
      await AdminLogs.insertOne({
        orderId: String(order._id),
        action: "refund_email_failed",
        error: (e as Error).message,
        timestamp: new Date().toISOString(),
        performedBy: session.user.email,
      });
    }

    return res.status(200).json({
      ok: true,
      refund: refundEntry,
      status: newStatus,
      refundedTotal,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Refund failed" });
  }
}
