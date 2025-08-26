// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { getDb } from "@/lib/products"; // use your existing db helper

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

// ---- helpers to normalize legacy docs so your UI always has what it needs ----
function inferDepartment(doc: any): "jewelry" | "watch" {
  if (doc?.department)
    return String(doc.department).toLowerCase() === "watch"
      ? "watch"
      : "jewelry";
  const cat = String(doc?.category || "").toLowerCase();
  if (cat === "watch" || cat === "watches") return "watch";
  return "jewelry";
}

function firstImage(doc: any): string {
  if (doc?.imageUrl) return String(doc.imageUrl);
  if (Array.isArray(doc?.images) && doc.images.length)
    return String(doc.images[0]);
  if (doc?.image) return String(doc.image);
  return "";
}

function normalizeDoc(doc: any) {
  const subCategory = doc?.subCategory ?? doc?.subcategory ?? undefined;

  return {
    ...doc,
    department: inferDepartment(doc),
    subCategory,
    imageUrl: firstImage(doc), // ✅ ensures your admin UI sees an image
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin)
    return res.status(403).json({ error: "Forbidden" });

  // ----------------- GET: tolerant of legacy docs -----------------
  if (req.method === "GET") {
    try {
      const db = await getDb();
      const { department, category, subCategory, q, audience, specs } =
        req.query;

      const filter: any = {};

      // IMPORTANT: don't require department for legacy docs; only filter if provided
      if (typeof department === "string" && department) {
        filter.department = department;
      }

      if (typeof category === "string" && category) filter.category = category;

      // accept either subCategory or subcategory in DB; we normalize after fetch anyway
      if (typeof subCategory === "string" && subCategory) {
        filter.$or = [
          ...(filter.$or || []),
          { subCategory },
          { subcategory: subCategory },
        ];
      }

      if (typeof q === "string" && q.trim()) {
        filter.$or = [
          ...(filter.$or || []),
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
        } catch {
          // ignore invalid JSON
        }
      }

      const raw = await db
        .collection("products")
        .find(Object.keys(filter).length ? filter : {})
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      const products = raw.map(normalizeDoc);

      return res.status(200).json({ products });
    } catch (e: any) {
      console.error("GET products error", e);
      return res.status(500).json({ error: "Failed to load products" });
    }
  }

  // ----------------- POST: create (multipart + Cloudinary) -----------------
  if (req.method === "POST") {
    try {
      const db = await getDb();
      const { fields, files } = await parseForm(req);

      const name = String(fields.name || "").trim();
      const description = String(fields.description || "");
      const price = String(fields.price || "");
      const salePrice = String(fields.salePrice || "");
      const category = String(fields.category || "");
      const subcategoryIn = String(fields.subcategory || ""); // incoming form key
      const subCategory = subcategoryIn || "";
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
        subCategory: subCategory || undefined, // store with capital C
        featured,
        gender,
        imageUrl,
        images: imageUrl ? [imageUrl] : [], // mirror so legacy code also sees it
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection("products").insertOne(doc);
      const created = await db
        .collection("products")
        .findOne({ _id: result.insertedId });
      // normalize on the way out so UI is consistent
      return res.status(201).json({ product: normalizeDoc(created) });
    } catch (e: any) {
      console.error("POST create product error", e);
      return res.status(400).json({ error: e?.message || "Create failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
