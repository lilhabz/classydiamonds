// 📂 lib/mongodb.ts
// ✅ Single Mongo client across server hot reloads
// ✅ Shared helpers: getDb() and getCollection() so all readers/writers resolve the SAME DB
// ✅ Keeps default export `clientPromise` for backward compatibility

import { MongoClient, type Collection, type Document, Db } from "mongodb";

const uri = process.env.MONGODB_URI as string | undefined;
const options = {}; // add poolSize, retryWrites, etc., if needed

let client: MongoClient;
// Default export for existing imports
let clientPromise: Promise<MongoClient>;
let _db: Db | null = null;

// 🔐 Type-safe global cache (Next.js dev hot-reload)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Build-time (no URI) guard: keep the build from crashing,
// but at RUNTIME we’ll throw if helpers are actually used.
if (uri) {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  clientPromise = Promise.resolve(null as unknown as MongoClient);
}

/**
 * 🧠 Resolve the database name consistently.
 * Priority:
 * 1) Explicit dbName arg
 * 2) MONGODB_DB env
 * 3) Derive from MONGODB_URI path (…/<db>?…)
 * 4) Fallback to app default ("classydiamonds")
 */
function resolveDbName(explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();

  const envDb = process.env.MONGODB_DB?.trim();
  if (envDb) return envDb;

  // derive from URI path if present
  try {
    if (process.env.MONGODB_URI) {
      const u = new URL(process.env.MONGODB_URI);
      const path = u.pathname.replace(/^\/+/, ""); // remove leading '/'
      if (path) return path;
    }
  } catch {
    // ignore parse errors
  }

  // final fallback — choose your real app DB (not "test")
  return "classydiamonds";
}

/**
 * 📦 Get a Mongo DB instance, ensuring URI exists at runtime.
 */
export async function getDb(dbName?: string) {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your .env.local to use the database at runtime."
    );
  }
  if (_db) return _db;
  const c = await clientPromise;
  _db = c.db(resolveDbName(dbName));
  return _db;
}

/**
 * 🗂️ Get a typed collection from the resolved DB.
 * Usage: const products = await getCollection<Product>('products')
 */
export async function getCollection<T extends Document = Document>(
  collectionName: string,
  dbName?: string
): Promise<Collection<T>> {
  const db = await getDb(dbName);
  return db.collection<T>(collectionName);
}

export default clientPromise;
