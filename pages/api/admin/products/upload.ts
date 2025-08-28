// pages/api/admin/products/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]"; // ✅ corrected path
import formidable, { File as FormidableFile } from "formidable";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

function parseForm(req: NextApiRequest) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024,
  });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
    (resolve, reject) => {
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      );
    }
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const { files } = await parseForm(req);
    const file = files.image as FormidableFile | undefined;
    if (!file?.filepath) {
      return res.status(400).json({ ok: false, error: "Missing image file" });
    }

    const uploaded = await cloudinary.uploader.upload(file.filepath, {
      folder: "classy-diamonds/products",
      resource_type: "image",
    });

    return res.status(201).json({ ok: true, imageUrl: uploaded.secure_url });
  } catch (e: any) {
    console.error("Upload error:", e);
    return res
      .status(400)
      .json({ ok: false, error: e?.message || "Upload failed" });
  }
}
