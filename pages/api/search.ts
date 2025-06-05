import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { promises as fs } from "fs";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const query = ((req.query.q as string) || "").trim();
  if (!query) {
    return res.status(200).json({ pages: [], products: [] });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const regex = new RegExp(query, "i");

    // 📝 Modify the fields inside $or if your product schema changes
    const products = await db
      .collection("products")
      .find({
        $or: [
          { name: { $regex: regex } },
          { description: { $regex: regex } },
          { category: { $regex: regex } },
          { tags: { $elemMatch: { $regex: regex } } },
        ],
      })
      .limit(20)
      .toArray();

    const mapped = products.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      price: p.price,
      image: p.imageUrl || p.image,
      slug: p.slug,
      category: p.category,
      description: p.description,
    }));

    const pagesDir = path.join(process.cwd(), "pages");
    const pageResults: { title: string; path: string }[] = [];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const rel = path.relative(pagesDir, entryPath);
        if (entry.isDirectory()) {
          if (rel.startsWith("api") || entry.name.startsWith("[")) continue;
          await walk(entryPath);
        } else {
          if (!entry.name.match(/\.tsx?$/)) continue;
          if (rel.startsWith("api")) continue;
          if (entry.name.startsWith("[")) continue;
          if (entry.name === "_app.tsx" || entry.name === "_document.tsx") continue;

          const parts = rel.split(path.sep).map((p) => p.replace(/\.tsx?$/, ""));
          const file = parts.pop() as string;
          if (file === "index") {
            const href = "/" + parts.join("/");
            const title = parts.length === 0 ? "Home" : parts[parts.length - 1];
            if (title.toLowerCase().includes(query.toLowerCase())) {
              pageResults.push({
                title: title.replace(/-/g, " "),
                path: href || "/",
              });
            }
          } else {
            const href = "/" + [...parts, file].join("/");
            const title = file;
            if (title.toLowerCase().includes(query.toLowerCase())) {
              pageResults.push({
                title: title.replace(/-/g, " "),
                path: href,
              });
            }
          }
        }
      }
    };

    await walk(pagesDir);

    return res.status(200).json({ pages: pageResults.slice(0, 20), products: mapped });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Failed to search" });
  }
}
