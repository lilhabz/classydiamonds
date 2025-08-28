// /pages/api/admin/products/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]"; // NOTE: two-levels up from /products/
import formidable, { Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

function parseForm(
  req: NextApiRequest
): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !(session.user as any).isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const { files } = await parseForm(req);
    const file: any = (files as any).image;
    if (!file) return res.status(400).json({ ok: false, error: "No file" });

    const upload = await cloudinary.uploader.upload(file.filepath, {
      folder: "classy-products",
      overwrite: true,
      resource_type: "image",
    });

    return res.status(200).json({ ok: true, url: upload.secure_url });
  } catch (e: any) {
    console.error("Upload error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Upload failed" });
  }
}
