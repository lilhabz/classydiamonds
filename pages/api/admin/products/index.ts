import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import formidable, { File as FormidableFile, Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";
import { listProducts, createProduct } from "@/lib/products";

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

// Build a tolerant filter for legacy docs; safe to pass into listProducts()
function buildFilterFromQuery(query: NextApiRequest["query"]) {
  const { department, category, subCategory, q, audience, specs } = query;
  const filter: any = {};

  if (typeof department === "string" && department) {
    filter.$or = [
      ...(filter.$or || []),
      { department: department.toLowerCase() },
      { category: department.toLowerCase() }, // legacy
    ];
  }

  if (typeof category === "string" && category) {
    filter.category = category.toLowerCase();
  }

  if (typeof subCategory === "string" && subCategory) {
    filter.$or = [
      ...(filter.$or || []),
      { subCategory: subCategory.toLowerCase() },
      { subcategory: subCategory.toLowerCase() }, // legacy spelling
    ];
  }

  if (typeof q === "string" && q.trim()) {
    const rx = { $regex: q.trim(), $options: "i" };
    filter.$or = [
      ...(filter.$or || []),
      { title: rx },
      { name: rx },
      { description: rx },
      { tags: rx },
    ];
  }

  if (typeof audience === "string" && audience) {
    const a = audience
      .split(",")
      .map((s) => s.trim().toLowerCase())
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
      for (const [k, v] of Object.entries(wanted)) {
        and.push({ [`specs.${k}`]: v });
      }
      if (and.length) filter.$and = [...(filter.$and || []), ...and];
    } catch {
      // ignore
    }
  }

  return filter;
}

// Normalize for admin UI expectations
const toAdminRow = (p: any) => ({
  ...p,
  id: p._id, // some UIs key off "id"
  name: p.title || p.name || "",
  imageUrl: Array.isArray(p.images) && p.images.length ? p.images[0] : "",
  price: p.salePrice ?? p.discountedPrice ?? p.unitPrice ?? p.price ?? 0,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method === "GET") {
    try {
      const filter = buildFilterFromQuery(req.query);
      const products = await listProducts(filter, {
        limit: 500,
        sort: { createdAt: -1 },
      });

      // If you want to verify quickly, uncomment:
      // console.log("[admin/products] count=", products.length, "sample=", products[0]);

      return res.status(200).json({ products: products.map(toAdminRow) });
    } catch (e) {
      console.error("GET products error", e);
      return res.status(500).json({ error: "Failed to load products" });
    }
  }

  if (req.method === "POST") {
    try {
      const { fields, files } = await parseForm(req);

      const title = String(fields.name || fields.title || "").trim();
      const description = String(fields.description || "");
      const priceStr = String(fields.price || "");
      const salePriceStr = String(fields.salePrice || "");
      const category = String(fields.category || "").toLowerCase();
      const subCategory = String(fields.subcategory || "").toLowerCase();
      const gender = String(fields.gender || "unisex").toLowerCase();

      if (!title || !priceStr || !category) {
        return res
          .status(400)
          .json({
            error: "Missing required fields (title/name, price, category)",
          });
      }

      let uploadedUrl: string | undefined;
      const imageFile = files.image as FormidableFile | undefined;
      if (imageFile?.filepath) {
        const upload = await cloudinary.uploader.upload(imageFile.filepath, {
          folder: "classy-diamonds/products",
          resource_type: "image",
        });
        uploadedUrl = upload.secure_url;
      }

      const department =
        category === "watch" || category === "watches" ? "watch" : "jewelry";

      const created = await createProduct({
        title,
        category,
        subCategory: subCategory || undefined,
        department,
        price: Number(priceStr),
        salePrice: salePriceStr ? Number(salePriceStr) : undefined,
        images: uploadedUrl ? [uploadedUrl] : [],
        description,
        audience: [gender as any],
        tags: [],
      });

      return res.status(201).json({ product: toAdminRow(created) });
    } catch (e: any) {
      console.error("POST create product error", e);
      return res.status(400).json({ error: e?.message || "Create failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
