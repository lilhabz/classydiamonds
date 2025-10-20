// 📨 pages/api/reviews/create.ts – Create a New Review in MongoDB 🗄️
// (Full file – do NOT remove any lines.)
// Expects a POST with { sessionId: string, rating: number, comments: string }.

import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb"; // Your existing MongoDB connection helper


export const runtime = "nodejs";

type Data =
  | { success: true; reviewId: string }
  | { success: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // 🚫 Only allow POST
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method Not Allowed" });
  }

  const { sessionId, rating, comments } = req.body as {
    sessionId?: string;
    rating?: number;
    comments?: string;
  };

  // 🔍 Validate incoming data
  if (!sessionId || typeof sessionId !== "string") {
    return res
      .status(400)
      .json({ success: false, error: "Missing or invalid sessionId" });
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: "Invalid rating" });
  }
  if (typeof comments !== "string") {
    return res.status(400).json({ success: false, error: "Invalid comments" });
  }

  try {
    // 🔗 Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(); // uses the database from your MONGODB_URI

    // 🗄️ Insert the review into the “reviews” collection
    const newReview = {
      sessionId,
      rating,
      comments,
      createdAt: new Date(),
      // 🌱 Future fields: you could add userEmail or orderId if you store them elsewhere
    };

    const result = await db.collection("reviews").insertOne(newReview);

    return res
      .status(201)
      .json({ success: true, reviewId: result.insertedId.toString() });
  } catch (error: any) {
    console.error("Error inserting review:", error);
    return res
      .status(500)
      .json({
        success: false,
        error: "Internal server error when saving review",
      });
  }
}
