// ✅ Fixed: /pages/api/admin/products/upload.ts
// - Forces Node runtime (required for formidable + Cloudinary)
// - Keeps all your logic identical
// - Safe for Vercel deploy

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";

// 🚀 Force Node runtime so Vercel never runs this on Edge
export const runtime = "nodejs";

// ⚙️ Disable body parser because formidable handles the upload stream
export const config = { api: { bodyParser: false } };

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

// Utility: Parse multipart form with formidable
function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow POST only
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  // Require admin session
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !(session.user as any).isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const { files } = await parseForm(req);
    const file: any = (files as any).image;

    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    // Upload to Cloudinary
    const upload = await cloudinary.uploader.upload(file.filepath, {
      folder: "classy-products",
      overwrite: true,
      resource_type: "image",
    });

    console.log("✅ Cloudinary upload successful:", upload.secure_url);
    return res.status(200).json({ ok: true, url: upload.secure_url });
  } catch (err: any) {
    console.error("❌ Upload error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Upload failed" });
  }
}
