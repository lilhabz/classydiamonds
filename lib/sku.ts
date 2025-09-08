// lib/sku.ts
import type { Db, Collection } from "mongodb";

const COUNTER_ID = "skuNumber";

type CounterDoc = {
  _id: string; // string key for counters
  seq: number;
};

type ProductDoc = {
  skuNumber?: number | null;
};

function counterCol(db: Db): Collection<CounterDoc> {
  return db.collection<CounterDoc>("counters");
}

/** Ensure the counter doc exists. Idempotent. */
export async function ensureSkuCounter(db: Db) {
  await counterCol(db).updateOne(
    { _id: COUNTER_ID },
    { $setOnInsert: { seq: 0 } },
    { upsert: true }
  );
}

/** Atomically increments and returns the next sku number (1-based). */
export async function getNextSkuNumber(db: Db): Promise<number> {
  const res = await counterCol(db).findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return Number(res.value?.seq ?? 1);
}

/** Reset SKU counter back to 0 (idempotent). Use after a full product purge. */
export async function resetSkuCounter(db: Db) {
  await counterCol(db).updateOne(
    { _id: COUNTER_ID },
    { $set: { seq: 0 } },
    { upsert: true }
  );
}

/** Bump counter to >= max existing skuNumber (idempotent). */
export async function syncSkuCounterToMax(db: Db, collectionName: string) {
  const products = db.collection<ProductDoc>(collectionName);

  // ✅ Avoid $type: just require it to exist and not be null
  const maxDoc = await products
    .find({ skuNumber: { $exists: true, $ne: null } })
    .sort({ skuNumber: -1 })
    .project<{ skuNumber: number }>({ skuNumber: 1 })
    .limit(1)
    .next();

  const maxSku = Number(maxDoc?.skuNumber ?? 0);

  await counterCol(db).updateOne(
    { _id: COUNTER_ID },
    { $max: { seq: maxSku } },
    { upsert: true }
  );
}
