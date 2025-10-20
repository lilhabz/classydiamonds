// 📂 lib/mongodb.ts
// ✅ Single Mongo client across server hot reloads
// ✅ Fast fail timeouts to avoid Vercel 504s
// ✅ Shared helpers: getDb() / getCollection()
// ✅ Keeps default export `clientPromise` for backward compatibility

import {
  MongoClient,
  type MongoClientOptions,
  type Collection,
  type Document,
  Db,
} from "mongodb";

const uri = process.env.MONGODB_URI as string | undefined;

// ⚙️ Serverless-friendly driver options: fail fast instead of hanging to 504
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 5000, // find a node in 5s or throw
  connectTimeoutMS: 5000,         // TCP connect cap
  socketTimeoutMS: 15000,         // per-socket I/O cap
  maxPoolSize: 5,                 // small pool for serverless
  retryWrites: true,
  appName: "classydiamonds",
};

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

/* ------------------------------ DB name utils ------------------------------ */

function parseDbFromUri(u?: string) {
  try {
    const m = u?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
    return m?.[1];
  } catch {
    return undefined;
  }
}

/**
 * Priority:
 * 1) explicit arg
 * 2) MONGODB_DB
 * 3) DB from MONGODB_URI path
 * 4) fallback "classydiamonds"
 */
function resolveDbName(explicit?: string): string {
  return (
    explicit ||
    process.env.MONGODB_DB ||
    parseDbFromUri(uri) ||
    "classydiamonds"
  );
}

/* ------------------------------- Public API -------------------------------- */

export async function getDb(dbName?: string) {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your environment to use the database at runtime."
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
