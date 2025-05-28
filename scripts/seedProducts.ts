// 📄 scripts/seedProducts.ts – Seed static jewelry items with skuNumber 🛠️

import clientPromise from "../lib/mongodb";
import { jewelryData } from "../data/jewelryData";

async function seed() {
  console.log("🌱 Seeding products with sequential SKUs...");
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection("products");

  for (let idx = 0; idx < jewelryData.length; idx++) {
    const item = jewelryData[idx];
    const skuNumber = idx + 1;
    const existing = await collection.findOne({ slug: item.slug });

    if (existing) {
      const existingSku = existing.skuNumber ?? skuNumber;
      console.log(`🔁 Updating: ${item.name} (SKU ${existingSku})`);
      await collection.updateOne(
        { slug: item.slug },
        {
          $set: {
            ...item,
            skuNumber: existingSku,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      console.log(`➕ Inserting: ${item.name} (SKU ${skuNumber})`);
      await collection.insertOne({
        ...item,
        skuNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
