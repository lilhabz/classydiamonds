import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import clientPromise from "@/lib/mongodb";
import { IncomingForm } from "formidable";

export const config = { api: { bodyParser: false } };

type CustomPhoto = {
  _id: any;
  imageUrl: string;
  createdAt: Date;
};

type Data =
  | { success: true; photos: CustomPhoto[] }
  | { success: true; photo: CustomPhoto }
  | { success: false; message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
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

  if (req.method === "GET") {
    const raw = await collection.find().sort({ createdAt: -1 }).toArray();
    const photos: CustomPhoto[] = raw.map((doc: any) => ({
      _id: doc._id,
      imageUrl: doc.imageUrl,
      createdAt: doc.createdAt,
    }));
    return res.status(200).json({ success: true, photos });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res
      .status(405)
      .json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

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

    const uploadResult = await cloudinary.uploader.upload(imageFile.filepath, {
      folder: "classy-diamonds/custom/original",
      transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
      eager: [
        {
          folder: "classy-diamonds/custom/compressed",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    });
    const imageUrl = uploadResult.eager?.[0]?.secure_url || uploadResult.secure_url;

    const doc = { imageUrl, createdAt: new Date() };
    const result = await collection.insertOne(doc as any);
    const photo: CustomPhoto = { _id: result.insertedId, ...doc };
    return res.status(201).json({ success: true, photo });
  } catch (err: any) {
    console.error("Custom photo upload error", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
