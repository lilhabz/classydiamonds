// 📂 pages/api/admin/custom-photos.ts — GET list, POST upload, DELETE remove (with Cloudinary publicId)
import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import clientPromise from "@/lib/mongodb";
import { IncomingForm } from "formidable";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const config = { api: { bodyParser: false } };

type CustomPhoto = {
  _id: ObjectId;
  imageUrl: string;
  publicId?: string; // used for deletion
  createdAt: Date;
};

type Data =
  | { success: true; photos: CustomPhoto[] }
  | { success: true; photo: CustomPhoto }
  | { success: true }
  | { success: false; message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Cloudinary config check
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res
      .status(500)
      .json({ success: false, message: "Cloudinary configuration error" });
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<CustomPhoto>("customPhotos");

  // GET — list photos (you also have /api/custom-photos, but keeping this is fine)
  if (req.method === "GET") {
    const raw = await collection.find().sort({ createdAt: -1 }).toArray();
    const photos: CustomPhoto[] = raw.map((doc) => ({
      _id: doc._id,
      imageUrl: doc.imageUrl,
      publicId: doc.publicId,
      createdAt: doc.createdAt,
    }));
    return res.status(200).json({ success: true, photos });
  }

  // DELETE — remove by id (Mongo + Cloudinary)
  if (req.method === "DELETE") {
    try {
      const id = (req.query.id as string) || "";
      if (!id) {
        return res
          .status(400)
          .json({ success: false, message: "Missing id query parameter" });
      }

      const _id = new ObjectId(id);

      // TS is happy because _id is typed as ObjectId on CustomPhoto
      const doc = await collection.findOne({ _id });
      if (!doc) {
        return res
          .status(404)
          .json({ success: false, message: "Photo not found" });
      }

      // Use stored publicId; fallback tries to parse filename (best-effort)
      const publicId =
        doc.publicId || doc.imageUrl?.split("/").slice(-1)[0]?.split(".")[0];

      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (e: any) {
          // don't fail the whole request if Cloudinary already removed it
          console.warn("Cloudinary destroy warning:", e?.message || e);
        }
      }

      await collection.deleteOne({ _id });
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Custom photo delete error", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST — upload one image
  if (req.method === "POST") {
    try {
      const form = new IncomingForm();
      const { files } = await new Promise<any>((resolve, reject) => {
        form.parse(req, (err, _fields, fls) =>
          err ? reject(err) : resolve({ files: fls })
        );
      });

      const rawFile = files.image;
      const imageFile = Array.isArray(rawFile) ? rawFile[0] : rawFile;
      if (!imageFile || typeof imageFile === "string") {
        return res
          .status(400)
          .json({ success: false, message: "Image file missing" });
      }

      const uploadResult = await cloudinary.uploader.upload(
        imageFile.filepath,
        {
          folder: "classy-diamonds/custom/original",
          transformation: [
            { width: 600, height: 600, crop: "fill", gravity: "auto" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
          eager: [
            {
              folder: "classy-diamonds/custom/compressed",
              width: 600,
              height: 600,
              crop: "fill",
              gravity: "auto",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        }
      );

      const imageUrl =
        uploadResult.eager?.[0]?.secure_url || uploadResult.secure_url;
      const publicId = uploadResult.public_id;

      const doc: Omit<CustomPhoto, "_id"> = {
        imageUrl,
        publicId,
        createdAt: new Date(),
      };

      const result = await collection.insertOne(doc as any);
      const photo: CustomPhoto = { _id: result.insertedId, ...doc };

      return res.status(201).json({ success: true, photo });
    } catch (err: any) {
      console.error("Custom photo upload error", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res
    .status(405)
    .json({ success: false, message: `Method ${req.method} Not Allowed` });
}
