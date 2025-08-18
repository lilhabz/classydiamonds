// 📂 pages/api/admin/delete-order.ts — hard delete (admin-only, guarded + backup + junk purge)
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type Body = {
  orderId?: string; // Mongo _id (preferred)
  sessionId?: string; // Stripe session id (fallback)
  force?: boolean; // override safety guard (non-archived, non-junk)
  note?: string; // optional reason/note
  purgeJunk?: boolean; // delete all junk (requires force)
  dryRun?: boolean; // with purgeJunk: preview only
};

function looksLikeObjectId(s?: string) {
  return !!s && /^[0-9a-fA-F]{24}$/.test(s);
}

function isJunkOrder(doc: any) {
  const hasOrderNumber = typeof doc?.orderNumber === "number";
  const sess = (doc?.stripeSessionId || "").trim();
  const hasSession = !!sess;
  return !hasOrderNumber && !hasSession;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !(session.user as any)?.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const body = (req.body || {}) as Body;
    const { orderId, sessionId, force, note, purgeJunk, dryRun } = body;

    const db = (await clientPromise).db();
    const Orders = db.collection("orders");
    const Deleted = db.collection("orders_deleted");
    const Logs = db.collection("adminLogs");

    // 🧹 Bulk purge: delete all junk orders (no orderNumber AND no/empty stripeSessionId)
    if (purgeJunk) {
      if (!force) {
        return res.status(400).json({
          error:
            "purgeJunk requires force: true to proceed (safety guard). Use dryRun to preview.",
        });
      }

      const junkFilter = {
        $and: [
          { $or: [{ orderNumber: { $exists: false } }, { orderNumber: null }] },
          {
            $or: [
              { stripeSessionId: { $exists: false } },
              { stripeSessionId: null },
              { stripeSessionId: "" },
            ],
          },
        ],
      };

      if (dryRun) {
        const ids = await Orders.find(junkFilter, { projection: { _id: 1 } })
          .map((d) => String(d._id))
          .toArray();
        return res.status(200).json({
          ok: true,
          dryRun: true,
          matched: ids.length,
          ids,
        });
      }

      // Backup then delete
      const junkDocs = await Orders.find(junkFilter).toArray();
      if (junkDocs.length === 0) {
        return res.status(200).json({ ok: true, deletedCount: 0 });
      }

      // tag + store a snapshot
      const deletedAt = new Date();
      await Deleted.insertMany(
        junkDocs.map((d) => ({
          ...d,
          _deletedMeta: {
            deletedAt,
            deletedBy:
              session.user?.email || (session.user as any)?.name || "unknown",
            reason: note || "purgeJunk",
          },
        }))
      );

      const { deletedCount } = await Orders.deleteMany({
        _id: { $in: junkDocs.map((d) => d._id) },
      });

      await Logs.insertOne({
        action: "delete_order_bulk_junk",
        count: deletedCount,
        timestamp: deletedAt,
        performedBy:
          session.user?.email || (session.user as any)?.name || "unknown",
        note: note || "bulk junk purge",
      });

      return res.status(200).json({
        ok: true,
        deletedCount: deletedCount || 0,
        backedUpCount: junkDocs.length,
      });
    }

    // 🎯 Single delete path
    if (!orderId && !sessionId) {
      return res
        .status(400)
        .json({ error: "Provide orderId (Mongo _id) or sessionId" });
    }

    let query: any = null;
    if (looksLikeObjectId(orderId)) {
      query = { _id: new ObjectId(orderId as string) };
    } else if (sessionId) {
      query = { stripeSessionId: String(sessionId) };
    } else {
      return res
        .status(400)
        .json({ error: "Invalid orderId; missing sessionId fallback" });
    }

    const doc = await Orders.findOne(query);
    if (!doc) return res.status(404).json({ error: "Order not found" });

    const junk = isJunkOrder(doc);
    const archived = !!doc.archived;
    const deletable = archived || junk;

    // 🛡️ Prevent accidental deletion unless archived/junk or force=true
    if (!deletable && !force) {
      return res.status(409).json({
        error:
          "Refusing to delete a non-archived, non-junk order without force: true",
        archived,
        isJunk: junk,
      });
    }

    // ♻️ Backup the document to orders_deleted (with metadata), then delete
    const deletedAt = new Date();
    await Deleted.insertOne({
      ...doc,
      _deletedMeta: {
        deletedAt,
        deletedBy:
          session.user?.email || (session.user as any)?.name || "unknown",
        reason:
          note ||
          (archived
            ? "archived-delete"
            : junk
            ? "junk-delete"
            : "forced-delete"),
      },
    });

    await Orders.deleteOne({ _id: doc._id });

    await Logs.insertOne({
      orderId: String(doc._id),
      action: "delete_order",
      timestamp: deletedAt,
      performedBy:
        session.user?.email || (session.user as any)?.name || "unknown",
      archived,
      isJunk: junk,
      forced: !!force,
      note: note || "",
    });

    return res.status(200).json({
      ok: true,
      deletedId: String(doc._id),
      archived,
      isJunk: junk,
      forced: !!force,
    });
  } catch (e: any) {
    console.error("delete-order error:", e);
    return res.status(500).json({ error: e.message || "Delete failed" });
  }
}
