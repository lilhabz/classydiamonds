import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { File as FormidableFile } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { ObjectId } from "mongodb";

import {
  getProductById,
  updateProduct,
  deleteProduct as deleteProductLib,
} from "@/lib/products";

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

function publicIdFromUrl(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const ix = u.pathname.indexOf("/upload/");
    if (ix === -1) return null;
    const after = u.pathname.slice(ix + "/upload/".length);
    const noVersion = after.replace(/^v\d+\//, "");
    return noVersion.replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return null;
  }
}

const toAdminRow = (p: any) => ({
  ...p,
  id: p._id,
  name: p.title || p.name || "",
  imageUrl: Array.isArray(p.images) && p.images.length ? p.images[0] : "",
  price: p.salePrice ?? p.discountedPrice ?? p.unitPrice ?? p.price ?? 0,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin)
    return res.status(403).json({ error: "Forbidden" });

  const { id } = req.query;
  if (typeof id !== "string" || !ObjectId.isValid(id))
    return res.status(400).json({ error: "Invalid id" });

  if (req.method === "GET") {
    const product = await getProductById(id);
    if (!product) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ product: toAdminRow(product) });
  }

  if (req.method === "PUT") {
    try {
      const current = await getProductById(id);
      if (!current) return res.status(404).json({ error: "Not found" });

      const { fields, files } = await parseForm(req);
      const patch: any = {};

      if (fields.name !== undefined || fields.title !== undefined) {
        patch.title = String(fields.name ?? fields.title).trim();
      }
      if (fields.description !== undefined)
        patch.description = String(fields.description);
      if (fields.price !== undefined) patch.price = Number(fields.price);
      if (fields.salePrice !== undefined) {
        const v = String(fields.salePrice);
        patch.salePrice = v === "" ? undefined : Number(v);
      }
      if (fields.category !== undefined)
        patch.category = String(fields.category).toLowerCase();
      if (fields.subcategory !== undefined)
        patch.subCategory =
          String(fields.subcategory).toLowerCase() || undefined;

      if (patch.category) {
        patch.department =
          patch.category === "watch" || patch.category === "watches"
            ? "watch"
            : "jewelry";
      }

      const imageRemoved = String(fields.imageRemoved || "") === "true";
      const imageFile = files.image as FormidableFile | undefined;

      const currentUrl =
        Array.isArray(current.images) && current.images.length
          ? current.images[0]
          : "";

      if (imageRemoved && !imageFile) {
        const pub = publicIdFromUrl(currentUrl);
        if (pub) {
          try {
            await cloudinary.uploader.destroy(pub);
          } catch (e) {
            console.warn("Cloudinary destroy (remove) failed", e);
          }
        }
        patch.images = [];
      }

      if (imageFile?.filepath) {
        const pub = publicIdFromUrl(currentUrl);
        if (pub) {
          try {
            await cloudinary.uploader.destroy(pub);
          } catch (e) {
            console.warn("Cloudinary destroy (replace) failed", e);
          }
        }
        const upload = await cloudinary.uploader.upload(imageFile.filepath, {
          folder: "classy-diamonds/products",
          resource_type: "image",
        });
        patch.images = [upload.secure_url];
      }

      if (Object.keys(patch).length === 0) {
        const fresh = await getProductById(id);
        return res.status(200).json({ product: toAdminRow(fresh) });
      }

      const saved = await updateProduct(id, patch);
      if (!saved) return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ product: toAdminRow(saved) });
    } catch (e: any) {
      console.error("update product error", e);
      return res.status(400).json({ error: e?.message || "Update failed" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const toDelete = await getProductById(id);
      if (!toDelete) return res.status(404).json({ error: "Not found" });

      const first =
        Array.isArray(toDelete.images) && toDelete.images.length
          ? toDelete.images[0]
          : "";
      const pub = publicIdFromUrl(first);
      if (pub) {
        try {
          await cloudinary.uploader.destroy(pub);
        } catch (e) {
          console.warn("Cloudinary destroy (delete) failed", e);
        }
      }

      const ok = await deleteProductLib(id);
      if (!ok) return res.status(400).json({ error: "Delete failed" });
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      console.error("delete product error", e);
      return res.status(400).json({ error: e?.message || "Delete failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
