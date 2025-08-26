// scripts/migrateToAudience.ts
import clientPromise from "@/lib/mongodb";

async function run() {
  const db = (await clientPromise).db();
  const Products = db.collection("products");

  // Set default audience where missing
  await Products.updateMany(
    { $or: [{ audience: { $exists: false } }, { audience: { $size: 0 } }] },
    { $set: { audience: ["unisex"] } }
  );

  // Map old gender -> audience
  await Products.updateMany(
    { gender: "male" },
    { $set: { audience: ["men"] } }
  );
  await Products.updateMany(
    { gender: "female" },
    { $set: { audience: ["women"] } }
  );

  // Remove gender field
  await Products.updateMany(
    { gender: { $exists: true } },
    { $unset: { gender: "" } }
  );

  console.log("✅ Migration complete.");
  process.exit(0);
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
