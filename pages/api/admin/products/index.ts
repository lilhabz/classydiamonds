// pages/api/admin/products/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { getDb } from "@/lib/mongodb"; // ✅ unified DB helper
import formidable, { Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

type Source = "db" | "legacy";
type AdminProduct = {
  _id?: string;
  id?: string;
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  unitPrice?: number;
  salePrice?: number | null;
  category?: string;
  subcategory?: string | null;
  subCategory?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  images?: string[] | null;
  audience?: string[];
  specs?: Record<string, any>;
  source?: Source;
  archived?: boolean;
  createdAt?: string;
  department?: "jewelry" | "watch";
  skuNumber?: number;
};

type Ok =
  | {
      ok: true;
      items: AdminProduct[];
      counts: {
        primary: number;
        alsoProducts: number;
        legacy: number;
        totalAfterDedupe: number;
      };
      collectionsQueried: string[];
    }
  | {
      ok: true;
      product: any;
      productId: string;
    };

type Err = { ok: false; error: string };

// ✅ Same resolution policy everywhere
const PRIMARY_COLLECTION =
  process.env.PRODUCTS_COLLECTION ||
  process.env.NEXT_PUBLIC_PRODUCTS_COLLECTION ||
  "products";

const s = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: any) => {
  if (v == null || v === "") return undefined;
  const num =
    typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(num) ? num : undefined;
};
const toId = (x: any) =>
  typeof x === "string" ? x : x?.toString?.() ?? undefined;

function buildFilter(q: string) {
  if (!q) return {};
  const rx = {
    $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    $options: "i",
  };
  return {
    $or: [
      { name: rx },
      { title: rx },
      { productName: rx },
      { slug: rx },
      { description: rx },
      { category: rx },
      { subCategory: rx },
      { subcategory: rx },
    ],
  };
}

function adaptDb(doc: any): AdminProduct {
  const id = toId(doc?._id);
  const name = s(doc?.name) || undefined;
  const price = n(doc?.price);
  const salePrice = doc?.salePrice == null ? null : n(doc?.salePrice) ?? null;
  const image = s(doc?.image) || s(doc?.imageUrl) || null;
  const images = Array.isArray(doc?.images) ? doc.images.map(String) : null;
  const audience = Array.isArray(doc?.audience)
    ? doc.audience.map(String)
    : doc?.audience
    ? [String(doc.audience)]
    : ["unisex"];

  const cat = s(doc?.category);
  const dept =
    s(doc?.department).toLowerCase() === "watch" ||
    ["watch", "watches"].includes(cat.toLowerCase())
      ? "watch"
      : "jewelry";

  return {
    _id: id,
    slug: s(doc?.slug) || id || "",
    name,
    title: name,
    description: s(doc?.description) || undefined,
    price,
    unitPrice: price,
    salePrice,
    category: cat || undefined,
    subCategory: s(doc?.subCategory) || undefined,
    subcategory: s(doc?.subCategory) || undefined,
    imageUrl: s(doc?.imageUrl) || image,
    image: s(doc?.image) || image,
    images,
    audience,
    specs: doc?.specs && typeof doc.specs === "object" ? doc.specs : {},
    source: "db",
    archived: !!doc?.archived,
    createdAt: doc?.createdAt
      ? new Date(doc.createdAt).toISOString()
      : undefined,
    department: dept as any,
    skuNumber: typeof doc?.skuNumber === "number" ? doc.skuNumber : undefined,
  };
}

function adaptLegacy(doc: any): AdminProduct {
  const id = toId(doc?._id);
  const name =
    s(doc?.name) || s(doc?.title) || s(doc?.productName) || "Untitled (legacy)";
  const price = n(doc?.unitPrice ?? doc?.price);
  const img = s(doc?.image) || s(doc?.img) || s(doc?.imageUrl) || null;
  const cat =
    s(doc?.category) ||
    s(doc?.catagory) ||
    s(doc?.cat) ||
    s(doc?.rings) ||
    s(doc?.bracelets) ||
    s(doc?.necklaces) ||
    s(doc?.earrings) ||
    "";
  const sub =
    s(doc?.subCategory) || s(doc?.subcategory) || s(doc?.subcatagory) || "";
  const audience = Array.isArray(doc?.audience)
    ? doc.audience.map(String)
    : doc?.audience
    ? [String(doc.audience)]
    : ["unisex"];
  const dept =
    s(doc?.department).toLowerCase() === "watch" ||
    ["watch", "watches"].includes(cat.toLowerCase())
      ? "watch"
      : "jewelry";

  return {
    id,
    slug: s(doc?.slug) || id || "",
    name,
    title: name,
    description: s(doc?.description) || undefined,
    price,
    unitPrice: price,
    salePrice: n(doc?.salePrice) ?? null,
    category: cat || undefined,
    subCategory: sub || undefined,
    subcategory: sub || undefined,
    imageUrl: s(doc?.imageUrl) || img,
    image: s(doc?.image) || img,
    images: null,
    audience,
    specs: doc?.specs && typeof doc.specs === "object" ? doc.specs : {},
    source: "legacy",
    archived: !!doc?.archived,
    createdAt: doc?.createdAt
      ? new Date(doc.createdAt).toISOString()
      : undefined,
    department: dept as any,
    skuNumber: typeof doc?.skuNumber === "number" ? doc.skuNumber : undefined,
  };
}

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

function toBool(v: any) {
  const s = String(v ?? "").toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function toAudience(v: any): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return [v];
  }
  return ["unisex"];
}

function toSpecs(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    const parsed = JSON.parse(String(v));
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  // Admin gate
  const session: any = await getServerSession(req, res, authOptions as any);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  // -------------------- LIST (GET) --------------------
  if (req.method === "GET") {
    const db = await getDb();

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const includeLegacy =
      String(req.query.includeLegacy ?? "1").toLowerCase() !== "0" &&
      String(req.query.includeLegacy ?? "1").toLowerCase() !== "false";
    const filter = buildFilter(q);

    const collectionsToQuery = Array.from(
      new Set([PRIMARY_COLLECTION, "products"])
    );

    const results: AdminProduct[] = [];
    let primaryCount = 0;
    let alsoProductsCount = 0;

    for (const colName of collectionsToQuery) {
      try {
        const docs = await db.collection(colName).find(filter).toArray();
        const mapped = docs.map(adaptDb);
        results.push(...mapped);
        if (colName === PRIMARY_COLLECTION) primaryCount = mapped.length;
        if (colName === "products" && colName !== PRIMARY_COLLECTION)
          alsoProductsCount = mapped.length;
      } catch {
        // collection may not exist; skip
      }
    }

    // legacy (optional)
    let legacy: AdminProduct[] = [];
    let legacyCount = 0;
    if (includeLegacy) {
      try {
        const legacyDocs = await db
          .collection("legacyProducts")
          .find(filter)
          .toArray();
        legacy = legacyDocs.map(adaptLegacy);
        legacyCount = legacy.length;
      } catch {
        legacy = [];
      }
    }

    // Dedup by slug, prefer DB over legacy
    const seen = new Map<string, AdminProduct>();
    function keyFor(p: AdminProduct) {
      return (p.slug && p.slug.trim()) || (p._id ?? p.id ?? "");
    }
    for (const p of [...results, ...legacy]) {
      const k = keyFor(p);
      if (!k) continue;
      if (
        !seen.has(k) ||
        (seen.get(k)?.source === "legacy" && p.source === "db")
      )
        seen.set(k, p);
    }

    const items = Array.from(seen.values()).sort((a, b) => {
      if ((a.source === "legacy") !== (b.source === "legacy")) {
        return a.source === "legacy" ? 1 : -1;
      }
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });

    return res.status(200).json({
      ok: true,
      items,
      counts: {
        primary: primaryCount,
        alsoProducts: alsoProductsCount,
        legacy: legacyCount,
        totalAfterDedupe: items.length,
      },
      collectionsQueried: collectionsToQuery,
    });
  }

  // -------------------- CREATE (POST, multipart) --------------------
  if (req.method === "POST") {
    try {
      const db = await getDb();
      const products = db.collection(PRIMARY_COLLECTION);
      const { fields, files } = await parseForm(req);

      // Pull fields (mirror ProductForm)
      const title = s(fields.title ?? fields.name);
      const slug = s(fields.slug ?? fields.title ?? fields.name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
      if (!title || !slug) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing required: title/name and slug" });
      }

      const department = s(fields.department);
      const category = s(fields.category) || undefined;
      const subCategory = s(fields.subCategory || fields.subcategory) || "";
      const price = n(fields.unitPrice ?? fields.price) ?? 0;
      const salePrice =
        fields.salePrice == null ? null : n(fields.salePrice) ?? null;
      const archived = String(fields.archived ?? "").length
        ? String(fields.archived).toLowerCase() === "true" ||
          String(fields.archived) === "1"
        : false;
      const audience = toAudience(fields.audience);
      const specs = toSpecs(fields.specs);
      const description = s(fields.description);

      // Optional image file
      let imageUrl: string | null = null;
      const file: any = (files as any)?.image;
      if (file?.filepath) {
        const upload = await cloudinary.uploader.upload(file.filepath, {
          folder: "classy-products",
          overwrite: true,
          resource_type: "image",
        });
        imageUrl = upload.secure_url;
      }

      // 🔁 Normalize select specs to top-level fields used by storefront filters
      const toSlug = (val: any) =>
        (val ?? "").toString().trim().toLowerCase().replace(/\s+/g, "-");

      const normalized: Record<string, any> = {};
      if (specs.metal) normalized.metal = toSlug(specs.metal);
      if (specs.stone) normalized.stone = toSlug(specs.stone);
      if (specs.shape) normalized.shape = toSlug(specs.shape);
      if (specs.style) normalized.style = toSlug(specs.style);
      if (specs.color) normalized.color = toSlug(specs.color);
      if (specs.clarity) normalized.clarity = toSlug(specs.clarity);
      if (specs.cut) normalized.cut = toSlug(specs.cut);
      if (specs.carat && !Number.isNaN(Number(specs.carat))) {
        normalized.carat = Number(specs.carat);
      }

      const now = new Date();
      const doc = {
        name: title,
        title,
        slug,
        price,
        salePrice,
        category,
        subCategory: subCategory || null,
        // 👇 persisted normalized fields (only if present)
        ...(normalized.metal ? { metal: normalized.metal } : {}),
        ...(normalized.stone ? { stone: normalized.stone } : {}),
        ...(normalized.shape ? { shape: normalized.shape } : {}),
        ...(normalized.style ? { style: normalized.style } : {}),
        ...(normalized.color ? { color: normalized.color } : {}),
        ...(normalized.clarity ? { clarity: normalized.clarity } : {}),
        ...(normalized.cut ? { cut: normalized.cut } : {}),
        ...(normalized.carat !== undefined ? { carat: normalized.carat } : {}),
        imageUrl,
        images: imageUrl ? [imageUrl] : undefined,
        archived,
        specs, // keep full pretty specs for PDP display
        audience: audience.length ? audience : ["unisex"],
        description,
        department:
          department === "watch" || department === "jewelry"
            ? department
            : undefined,
        createdAt: now,
        updatedAt: now,
      };

      // Upsert by slug (so repeat migrations don’t duplicate)
      const { value } = await products.findOneAndUpdate(
        { slug },
        { $set: doc, $setOnInsert: { createdAt: now } },
        { upsert: true, returnDocument: "after" }
      );

      return res
        .status(200)
        .json({ ok: true, productId: String(value?._id), product: value });
    } catch (e: any) {
      console.error("create error:", e);
      return res
        .status(500)
        .json({ ok: false, error: e?.message || "Create failed" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
