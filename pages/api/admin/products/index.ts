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

// Normalize for admin UI expectations
const toAdminRow = (p: any) => ({
  ...p,
  id: p._id,
  name: p.title || p.name || "",
  imageUrl: Array.isArray(p.images) && p.images.length ? p.images[0] : "",
  price: p.salePrice ?? p.discountedPrice ?? p.unitPrice ?? p.price ?? 0,
});

/** Apply filters AFTER normalization so legacy docs also match */
function applyAdminFilters(products: any[], query: NextApiRequest["query"]) {
  const str = (v: any) => (typeof v === "string" ? v.toLowerCase().trim() : "");
  const arr = (v: any): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).toLowerCase().trim()) : [];

  const q = str(query.q);
  const department = str(query.department);
  const category = str(query.category);
  const subCategory = str(query.subCategory);
  const audienceList = str(query.audience)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // specs is optional JSON
  let specsWanted: Record<string, any> | null = null;
  if (typeof query.specs === "string" && query.specs) {
    try {
      specsWanted = JSON.parse(query.specs);
    } catch {
      specsWanted = null;
    }
  }

  return products.filter((p) => {
    const pDept = str(
      p.department || (p.category === "watch" ? "watch" : "jewelry")
    );
    const pCat = str(p.category);
    const pSub = str(p.subCategory);
    const pAud = arr(p.audience);
    const pTitle = (p.title || p.name || "").toString().toLowerCase();
    const pDesc = (p.description || "").toString().toLowerCase();
    const pTags = arr(p.tags);

    if (department && pDept !== department) return false;
    if (category && pCat !== category) return false;
    if (subCategory && pSub !== subCategory) return false;

    if (audienceList.length) {
      const set = new Set(pAud.length ? pAud : ["unisex"]);
      const anyMatch = audienceList.some((a) => set.has(a));
      if (!anyMatch) return false;
    }

    if (specsWanted && typeof p.specs === "object" && p.specs) {
      for (const [k, v] of Object.entries(specsWanted)) {
        if ((p.specs as any)[k] !== v) return false;
      }
    }

    if (q) {
      const hit =
        pTitle.includes(q) ||
        pDesc.includes(q) ||
        pTags.some((t) => t.includes(q));
      if (!hit) return false;
    }

    return true;
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // -------- GET: fetch normalized, then filter in-memory so legacy docs work --------
  if (req.method === "GET") {
    try {
      // Pull a generous page and filter locally (fast enough for admin use)
      const all = await listProducts(
        {},
        { limit: 1000, sort: { createdAt: -1 } }
      );
      const filtered = applyAdminFilters(all, req.query);
      return res.status(200).json({ products: filtered.map(toAdminRow) });
    } catch (e) {
      console.error("GET products error", e);
      return res.status(500).json({ error: "Failed to load products" });
    }
  }

  // ----------------- POST (Cloudinary + normalized create) -----------------
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
