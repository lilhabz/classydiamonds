// 📂 lib/mongoAdapter.ts

import clientPromise from "./mongodb";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";

export const adapter = MongoDBAdapter(clientPromise);
