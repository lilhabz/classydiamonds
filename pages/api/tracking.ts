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

  const session = await getServerSession(req, res, authOptions);
  const { orderId, trackingNumber, carrier, adminName: bodyName } = req.body;
  const adminName =
    bodyName ||
    session?.user?.firstName ||
    session?.user?.name?.split(" ")[0];
  if (!orderId || !trackingNumber) {
    return res.status(400).json({ error: "Missing orderId or trackingNumber" });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const order = await db.collection("orders").findOne({ stripeSessionId: orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    await db.collection("orders").updateOne(
      { stripeSessionId: orderId },
      {
        $set: {
          trackingNumber,
          carrier: carrier || "",
          trackingUpdatedAt: new Date(),
        },
      }
    );

    await db.collection("adminLogs").insertOne({
      orderId,
      action: "tracking",
      timestamp: new Date(),
      performedBy: adminName || "unknown",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const carrierUrls: Record<string, string> = {
      USPS: "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
      UPS: "https://www.ups.com/track?loc=en_US&tracknum=",
      FedEx: "https://www.fedex.com/fedextrack/?trknbr=",
    };

    const urlBase = carrierUrls[carrier] || "";
    const trackingLink = urlBase ? `${urlBase}${trackingNumber}` : trackingNumber;

    const orderDetails = buildOrderDetailsHtml(order);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
        <h2 style="color: #1f2a44;">Your Tracking Number</h2>
        <p>Hi ${order.customerName},</p>
        <p>Your order has been shipped. Here is your tracking number:</p>
        <p><strong>${trackingNumber}</strong></p>
        ${urlBase ? `<p><a href="${trackingLink}">Track Your Package</a></p>` : ""}
        ${orderDetails}
        <p style="margin-top: 30px; font-size: 14px;">
          If you have any questions, reply to this email or contact
          <a href="mailto:support@classydiamonds.com">support@classydiamonds.com</a>
        </p>
      </div>`;

    await transporter.sendMail({
      from: `"Classy Diamonds" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: "📦 Your Tracking Number",
      html,
    });

    console.log("📧 Tracking email sent to:", order.customerEmail);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Tracking update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
