// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { getDb } from "@/lib/products"; // ⬅️ use your helper

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
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin)
    return res.status(403).json({ error: "Forbidden" });

  // ---------- GET ----------
  if (req.method === "GET") {
    try {
      const db = await getDb();
      const { department, category, subCategory, q, audience, specs } =
        req.query;

      const filter: any = {};
      filter.department =
        typeof department === "string" && department ? department : "jewelry";
      if (typeof category === "string" && category) filter.category = category;
      if (typeof subCategory === "string" && subCategory)
        filter.subCategory = subCategory; // ⬅️ capital C

      if (typeof q === "string" && q.trim()) {
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { tags: { $regex: q, $options: "i" } },
        ];
      }

      if (typeof audience === "string" && audience) {
        const a = audience
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (a.length) {
          filter.$expr = {
            $gt: [
              {
                $size: {
                  $setIntersection: [{ $ifNull: ["$audience", ["unisex"]] }, a],
                },
              },
              0,
            ],
          };
        }
      }

      if (typeof specs === "string" && specs) {
        try {
          const wanted = JSON.parse(specs);
          const and: any[] = [];
          for (const [k, v] of Object.entries(wanted))
            and.push({ [`specs.${k}`]: v });
          if (and.length) filter.$and = [...(filter.$and || []), ...and];
        } catch {}
      }

      const items = await db
        .collection("products")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();
      return res.status(200).json({ products: items });
    } catch (e: any) {
      console.error("GET products error", e);
      return res.status(500).json({ error: "Failed to load products" });
    }
  }

  // ---------- POST (multipart + Cloudinary) ----------
  if (req.method === "POST") {
    try {
      const db = await getDb();
      const { fields, files } = await parseForm(req);

      const name = String(fields.name || "").trim();
      const description = String(fields.description || "");
      const price = String(fields.price || "");
      const salePrice = String(fields.salePrice || "");
      const category = String(fields.category || "");
      const subcategoryIn = String(fields.subcategory || ""); // form uses "subcategory"
      const subCategory = subcategoryIn || ""; // store as "subCategory"
      const featured = String(fields.featured || "") === "true";
      const gender = String(fields.gender || "unisex") as
        | "unisex"
        | "him"
        | "her";

      if (!name || !price || !category)
        return res
          .status(400)
          .json({ error: "Missing required fields (name, price, category)" });

      const department =
        category === "watches" || category === "watch" ? "watch" : "jewelry";

      let imageUrl: string | undefined;
      const imageFile = files.image as FormidableFile | undefined;
      if (imageFile?.filepath) {
        const upload = await cloudinary.uploader.upload(imageFile.filepath, {
          folder: "classy-diamonds/products",
          resource_type: "image",
        });
        imageUrl = upload.secure_url;
      }

      const now = new Date();
      const doc: any = {
        department,
        name,
        title: name,
        description,
        price: Number(price),
        salePrice: salePrice ? Number(salePrice) : undefined,
        category,
        subCategory: subCategory || undefined, // ⬅️ capital C in DB
        featured,
        gender,
        imageUrl, // ⬅️ for your admin UI
        images: imageUrl ? [imageUrl] : [], // ⬅️ mirror into images[] for the rest of the site
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection("products").insertOne(doc);
      const created = await db
        .collection("products")
        .findOne({ _id: result.insertedId });
      return res.status(201).json({ product: created });
    } catch (e: any) {
      console.error("POST create product error", e);
      return res.status(400).json({ error: e?.message || "Create failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
