// 📂 lib/mongodb.ts

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

// 🧠 Fix TypeScript global issue
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (uri) {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  // When building without a MongoDB URI (e.g. CI build), return a dummy promise
  clientPromise = Promise.resolve(null as any);
}

export default clientPromise;
