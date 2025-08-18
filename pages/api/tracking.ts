import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { buildOrderDetailsHtml } from "@/lib/emailUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 Server-side admin check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !(session.user as any)?.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { orderId, trackingNumber, carrier, adminName } = req.body;

  if (!orderId || !trackingNumber) {
    return res.status(400).json({ error: "Missing orderId or trackingNumber" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const order = await db
      .collection("orders")
      .findOne({ stripeSessionId: orderId });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const isFirstTracking = !order.trackingNumber;

    const normalizedCarrier = String(carrier || "")
      .trim()
      .toUpperCase(); // USPS | UPS | FEDEX (or blank)

    // ✅ Update order tracking fields
    await db.collection("orders").updateOne(
      { stripeSessionId: orderId },
      {
        $set: {
          trackingNumber,
          carrier: normalizedCarrier,
          trackingUpdatedAt: new Date(),
          ...(isFirstTracking ? { trackingEmailSentAt: new Date() } : {}),
        },
      }
    );

    // 📝 Log with more context
    await db.collection("adminLogs").insertOne({
      orderId,
      action: "tracking",
      trackingNumber,
      carrier: normalizedCarrier,
      timestamp: new Date(),
      performedBy: adminName || (session.user as any)?.name || "unknown",
    });

    // ✉️ Only send email when first tracking is set
    let emailSent = false;
    if (isFirstTracking) {
      const fromEmail = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;
      const recipient = order.customerEmail;

      if (fromEmail && pass && recipient) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: fromEmail, pass },
        });

        // Name safety: avoid literal "Stripe"
        const safeName =
          typeof order.customerName === "string" &&
          order.customerName.trim().toLowerCase() !== "stripe"
            ? order.customerName
            : recipient?.split("@")[0]?.replace(/\./g, " ") || "Customer";

        const carrierUrls: Record<string, string> = {
          USPS: "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
          UPS: "https://www.ups.com/track?loc=en_US&tracknum=",
          FEDEX: "https://www.fedex.com/fedextrack/?trknbr=",
        };

        const urlBase = carrierUrls[normalizedCarrier] || "";
        const trackingLink = urlBase ? `${urlBase}${trackingNumber}` : "";

        // Render order details (items, totals, etc.)
        const orderForEmail = { ...order, customerName: safeName };
        const orderDetails = buildOrderDetailsHtml(orderForEmail);

        const html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
            <h2 style="color: #1f2a44;">Your Tracking Number</h2>
            <p>Hi ${safeName},</p>
            <p>Your order has been shipped. Here is your tracking number:</p>
            <p><strong>${trackingNumber}</strong></p>
            ${
              trackingLink
                ? `<p><a href="${trackingLink}">Track Your Package</a></p>`
                : ""
            }
            ${orderDetails}
            <p style="margin-top: 30px; font-size: 14px;">
              If you have any questions, reply to this email or contact
              <a href="mailto:support@classydiamonds.com">support@classydiamonds.com</a>
            </p>
          </div>`;

        await transporter.sendMail({
          from: `"Classy Diamonds" <${fromEmail}>`,
          to: recipient,
          subject: "📦 Your Tracking Number",
          html,
        });

        console.log("📧 Tracking email sent to:", recipient);
        emailSent = true;
      } else {
        console.warn(
          "⚠️ Skipping tracking email: missing EMAIL_USER/EMAIL_PASS or recipient."
        );
      }
    } else {
      console.log(
        "ℹ️ Tracking updated without resending email for:",
        order.customerEmail
      );
    }

    return res.status(200).json({ success: true, emailSent, isFirstTracking });
  } catch (err) {
    console.error("❌ Tracking update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
