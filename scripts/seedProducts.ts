// 📄 scripts/seedProducts.ts – Seed static jewelry items into MongoDB 🛠️

// 🔄 Use relative import for MongoDB client
import clientPromise from "../lib/mongodb";
import { jewelryData } from "../data/jewelryData";

async function seed() {
  console.log("🌱 Seeding products...");
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection("products");

  for (const item of jewelryData) {
    const { slug } = item;
    const existing = await collection.findOne({ slug });
    if (existing) {
      console.log(`🔁 Updating existing product: ${item.name}`);
      await collection.updateOne(
        { slug },
        { $set: { ...item, updatedAt: new Date() } }
      );
    } else {
      console.log(`➕ Inserting new product: ${item.name}`);
      await collection.insertOne({
        ...item,
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
